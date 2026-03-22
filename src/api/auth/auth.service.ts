import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../../utils/prisma.js';
import {
	generateAccessToken,
	generateRefreshToken,
	generateEmailVerificationToken,
	generatePasswordResetToken,
	verifyRefreshToken,
	verifyEmailVerificationToken,
	verifyPasswordResetToken,
	type TokenPayload
} from '../../utils/jwt.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../utils/email.js';
import type {
	RegisterInput,
	LoginInput,
	GoogleLoginInput,
	ForgotPasswordInput,
	ResetPasswordInput
} from './auth.validation.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Store refresh tokens (in production, use Redis or database)
const refreshTokenStore = new Map<number, Set<string>>();

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

	// Generate verification token and send email
	const verificationToken = generateEmailVerificationToken(user.id, user.email);
	await sendVerificationEmail(user.email, verificationToken);

	return {
		message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.'
	};
};

export const verifyEmail = async (token: string) => {
	try {
		const { userId, email } = verifyEmailVerificationToken(token);

		const user = await prisma.user.findUnique({
			where: { id: userId, email }
		});

		if (!user) {
			throw new Error('Người dùng không tồn tại');
		}

		if (user.is_verified) {
			throw new Error('Tài khoản đã được xác thực');
		}

		await prisma.user.update({
			where: { id: userId },
			data: { is_verified: true }
		});

		return { message: 'Xác thực email thành công' };
	} catch (error: any) {
		throw new Error('Token không hợp lệ hoặc đã hết hạn');
	}
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

	// Store refresh token
	if (!refreshTokenStore.has(user.id)) {
		refreshTokenStore.set(user.id, new Set());
	}
	refreshTokenStore.get(user.id)!.add(refreshToken);

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

		// Store refresh token
		if (!refreshTokenStore.has(user.id)) {
			refreshTokenStore.set(user.id, new Set());
		}
		refreshTokenStore.get(user.id)!.add(refreshToken);

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

		// Check if refresh token exists in store
		const userTokens = refreshTokenStore.get(payload.userId);
		if (!userTokens || !userTokens.has(refreshToken)) {
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

		// Invalidate all refresh tokens for this user
		refreshTokenStore.delete(userId);

		return { message: 'Đặt lại mật khẩu thành công' };
	} catch (error: any) {
		throw new Error('Token không hợp lệ hoặc đã hết hạn');
	}
};

export const logout = async (userId: number, refreshToken: string) => {
	const userTokens = refreshTokenStore.get(userId);
	if (userTokens) {
		userTokens.delete(refreshToken);
		if (userTokens.size === 0) {
			refreshTokenStore.delete(userId);
		}
	}

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

	// Invalidate all refresh tokens for this user
	refreshTokenStore.delete(userId);

	return { message: 'Đặt lại mật khẩu thành công' };
};
