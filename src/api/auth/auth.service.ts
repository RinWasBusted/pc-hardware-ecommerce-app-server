import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../../utils/prisma.js';
import {
	generateAccessToken,
	generateRefreshToken,
	generatePasswordResetToken,
	getRefreshTokenTtlSeconds,
	verifyRefreshToken,
	verifyPasswordResetToken,
	type TokenPayload
} from '../../utils/jwt.js';
import {
	storeRefreshToken,
	hasRefreshToken,
	revokeRefreshToken,
	revokeAllRefreshTokens,
	storeVerifyCode,
	getVerifyCode,
	deleteVerifyCode
} from '../../utils/redis.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/email.js';
import type {
	RegisterInput,
	LoginInput,
	GoogleLoginInput,
	ForgotPasswordInput,
	ResetPasswordInput,
	VerifyEmailInput,
	ResendVerifyEmailInput
} from './auth.validation.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const VERIFICATION_CODE_CHARSET =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const persistRefreshToken = async (userId: number, refreshToken: string) => {
	const refreshTokenTtlSeconds = getRefreshTokenTtlSeconds(refreshToken);
	await storeRefreshToken(userId, refreshToken, refreshTokenTtlSeconds);
};

const generateVerificationCode = () => {
	const bytes = crypto.randomBytes(6);
	return Array.from(bytes, (byte) => VERIFICATION_CODE_CHARSET[byte % VERIFICATION_CODE_CHARSET.length]).join('');
};

const createAndSendVerificationCode = async (email: string) => {
	const verificationCode = generateVerificationCode();
	await storeVerifyCode(email, verificationCode);
	await sendVerificationEmail(email, verificationCode);
};

export const register = async (data: RegisterInput) => {
	// Check if user already exists
	const existingUser = await prisma.user.findUnique({
		where: { email: data.email }
	});

	if (existingUser) {
		throw new Error('Email đã được sử dụng');
	}

	// Hash password
	const hashedPassword = await bcrypt.hash(data.password, 10);

	// Create user
	const user = await prisma.user.create({
		data: {
			full_name: data.full_name,
			email: data.email,
			phone_number: data.phone_number ?? null,
			password: hashedPassword,
			role: 'customer',
			is_verified: false,
			is_active: true
		}
	});

	// Create address if provided
	if (data.address) {
		await prisma.addresses.create({
			data: {
				user_id: user.id,
				...data.address
			}
		});
	}

	try {
		await createAndSendVerificationCode(user.email);
	} catch (error: any) {
		throw new Error(
			'Đăng ký thành công nhưng gửi mã xác thực thất bại. Vui lòng yêu cầu gửi lại mã xác thực.'
		);
	}

	return {
		message: 'Đăng ký thành công. Vui lòng kiểm tra email và nhập mã xác thực để kích hoạt tài khoản.'
	};
};

export const verifyEmail = async (data: VerifyEmailInput) => {
	const user = await prisma.user.findUnique({
		where: { email: data.email }
	});

	if (!user) {
		throw new Error('Người dùng không tồn tại');
	}

	if (user.is_verified) {
		throw new Error('Tài khoản đã được xác thực');
	}

	const storedCode = await getVerifyCode(data.email);
	if (!storedCode) {
		throw new Error('Mã xác thực không tồn tại hoặc đã hết hạn');
	}

	if (storedCode !== data.code) {
		throw new Error('Mã xác thực không đúng');
	}

	await prisma.user.update({
		where: { id: user.id },
		data: { is_verified: true }
	});

	await deleteVerifyCode(data.email);

	return { message: 'Xác thực email thành công' };
};

export const resendVerifyEmail = async (data: ResendVerifyEmailInput) => {
	const user = await prisma.user.findUnique({
		where: { email: data.email }
	});

	if (!user) {
		throw new Error('Người dùng không tồn tại');
	}

	if (user.is_verified) {
		throw new Error('Tài khoản đã được xác thực');
	}

	await deleteVerifyCode(data.email);
	await createAndSendVerificationCode(data.email);

	return { message: 'Gửi lại mã xác thực thành công. Vui lòng kiểm tra email của bạn.' };
};

export const login = async (data: LoginInput) => {
	const user = await prisma.user.findUnique({
		where: { email: data.email }
	});

	if (!user) {
		throw new Error('Email hoặc mật khẩu không đúng');
	}

	const isPasswordValid = await bcrypt.compare(data.password, user.password);
	if (!isPasswordValid) {
		throw new Error('Email hoặc mật khẩu không đúng');
	}

	if (!user.is_verified) {
		throw new Error('Tài khoản chưa được xác thực. Vui lòng kiểm tra email.');
	}

	if (!user.is_active) {
		throw new Error('Tài khoản đã bị vô hiệu hóa');
	}

	const tokenPayload: TokenPayload = {
		userId: user.id,
		email: user.email,
		role: user.role
	};

	const accessToken = generateAccessToken(tokenPayload);
	const refreshToken = generateRefreshToken(tokenPayload);

	await persistRefreshToken(user.id, refreshToken);

	return {
		tokens: {
			access_token: accessToken,
			refresh_token: refreshToken
		},
		user: {
			id: user.id,
			full_name: user.full_name,
			email: user.email,
			role: user.role
		}
	};
};

export const googleLogin = async (data: GoogleLoginInput) => {
	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: data.id_token,
			audience: process.env.GOOGLE_CLIENT_ID as string
		});

		const payload = ticket.getPayload();
		if (!payload || !payload.email) {
			throw new Error('Invalid Google token');
		}

		let user = await prisma.user.findUnique({
			where: { email: payload.email }
		});

		if (!user) {
			// Create new user
			user = await prisma.user.create({
				data: {
					full_name: payload.name || '',
					email: payload.email,
					google_id: payload.sub,
					password: '', // No password for Google users
					role: 'customer',
					is_verified: true, // Google users are auto-verified
					is_active: true
				}
			});
		} else if (!user.google_id) {
			// Link Google account to existing user
			user = await prisma.user.update({
				where: { id: user.id },
				data: {
					google_id: payload.sub,
					is_verified: true
				}
			});
		}

		if (!user.is_active) {
			throw new Error('Tài khoản đã bị vô hiệu hóa');
		}

		const tokenPayload: TokenPayload = {
			userId: user.id,
			email: user.email,
			role: user.role
		};

		const accessToken = generateAccessToken(tokenPayload);
		const refreshToken = generateRefreshToken(tokenPayload);

		await persistRefreshToken(user.id, refreshToken);

		return {
			access_token: accessToken,
			refresh_token: refreshToken,
			user: {
				id: user.id,
				full_name: user.full_name,
				email: user.email,
				role: user.role
			}
		};
	} catch (error: any) {
		throw new Error('Google authentication failed');
	}
};

export const refreshAccessToken = async (refreshToken: string) => {
	try {
		const payload = verifyRefreshToken(refreshToken);

		const tokenExists = await hasRefreshToken(refreshToken);
		if (!tokenExists) {
			throw new Error('Invalid refresh token');
		}

		const user = await prisma.user.findUnique({
			where: { id: payload.userId }
		});

		if (!user || !user.is_active) {
			throw new Error('User not found or inactive');
		}

		const tokenPayload: TokenPayload = {
			userId: user.id,
			email: user.email,
			role: user.role
		};

		const newAccessToken = generateAccessToken(tokenPayload);

		return {
			access_token: newAccessToken
		};
	} catch (error: any) {
		throw new Error('Invalid or expired refresh token');
	}
};

export const forgotPassword = async (data: ForgotPasswordInput, is_mobile: boolean) => {
	const user = await prisma.user.findUnique({
		where: { email: data.email }
	});

	if (!user) {
		// Email không tồn tại
		throw new Error('Email không tồn tại trong hệ thống');
	}

	// Email tồn tại - gửi reset email với token
	const resetToken = generatePasswordResetToken(user.id, user.email);
	
	await sendPasswordResetEmail(user.email, resetToken);

	return {
		message: 'Email hướng dẫn đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.'
	};
};

export const resetPassword = async (data: ResetPasswordInput) => {
	try {
		const { userId, email } = verifyPasswordResetToken(data.token);

		const user = await prisma.user.findUnique({
			where: { id: userId, email }
		});

		if (!user) {
			throw new Error('Người dùng không tồn tại');
		}

		const hashedPassword = await bcrypt.hash(data.new_password, 10);

		await prisma.user.update({
			where: { id: userId },
			data: { password: hashedPassword }
		});

		await revokeAllRefreshTokens(userId);

		return { message: 'Đặt lại mật khẩu thành công' };
	} catch (error: any) {
		throw new Error('Token không hợp lệ hoặc đã hết hạn');
	}
};

export const logout = async (userId: number, refreshToken: string) => {
	await revokeRefreshToken(userId, refreshToken);

	return { message: 'Đăng xuất thành công' };
};

export const redirectResetPassword = async (token: string, is_mobile: boolean) => {
	try {
		const { userId, email } = verifyPasswordResetToken(token);

		const user = await prisma.user.findUnique({
			where: { id: userId, email }
		});

		if (!user) {
			throw new Error('Người dùng không tồn tại');
		}

		let redirectUrl = '';
		
		if (is_mobile) {
			redirectUrl = `${process.env.MOBILE_APP_URL || 'myapp://'}auth/reset-password?token=${token}`;
		} else {
			redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
		}

		return {
			message: 'Token xác thực hợp lệ',
			redirectUrl,
			token
		};
	} catch (error: any) {
		throw new Error('Token không hợp lệ hoặc đã hết hạn');
	}
};

export const resetPasswordUser = async (userId: number, oldPassword: string, newPassword: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId }
	});

	if (!user) {
		throw new Error('Người dùng không tồn tại');
	}

	const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
	if (!isPasswordValid) {
		throw new Error('Mật khẩu cũ không đúng');
	}

	if (oldPassword === newPassword) {
		throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ');
	}

	const hashedPassword = await bcrypt.hash(newPassword, 10);

	await prisma.user.update({
		where: { id: userId },
		data: { password: hashedPassword }
	});

	await revokeAllRefreshTokens(userId);

	return { message: 'Đặt lại mật khẩu thành công' };
};
