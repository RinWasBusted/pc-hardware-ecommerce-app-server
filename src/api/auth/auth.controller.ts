import type { Request, Response } from 'express';
import * as authService from './auth.service.js';
import type {
	RegisterInput,
	LoginInput,
	GoogleLoginInput,
	RefreshTokenInput,
	ForgotPasswordInput,
	ResetPasswordInput
} from './auth.validation.js';
import 'dotenv/config';

export const register = async (req: Request, res: Response) => {
	try {
		const data: RegisterInput = req.body;
		const result = await authService.register(data);
		res.status(201).json({
			success: true,
			...result
		});
	} catch (error: any) {
		res.status(400).json({
			success: false,
			message: error.message
		});
	}
};

export const verifyEmail = async (req: Request, res: Response) => {
	const { token } = req.query;
	if (!token || typeof token !== 'string') {
		return res.status(400).json({
			success: false,
			message: 'Token không hợp lệ'
		});
	}
	const user_agent = req.header('User-Agent') || 'Unknown';
	let verificationUrl = '';

	if(user_agent.includes('Mobile') || user_agent.includes('Android') || user_agent.includes('iPhone')) {
		verificationUrl = process.env.MOBILE_APP_URL ? `${process.env.MOBILE_APP_URL}://auth/verify-email` : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/email-verified`;
	} else {
		verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/email-verified`;
	}

	try {
		const result = await authService.verifyEmail(token);
		
		verificationUrl += `?success=true&message=${encodeURIComponent(result.message)}`;
		res.redirect(verificationUrl);
	} catch (error: any) {
		res.redirect(`${verificationUrl}?success=false&message=${encodeURIComponent(error.message)}`);
	}
};

export const login = async (req: Request, res: Response) => {
	try {
		const data: LoginInput = req.body;
		const result = await authService.login(data);

		res.status(200).json({
			success: true,
			access_token: result.tokens.access_token,
			refresh_token: result.tokens.refresh_token,
			user: result.user
		});
	} catch (error: any) {
		res.status(401).json({
			success: false,
			message: error.message
		});
	}
};

export const googleLogin = async (req: Request, res: Response) => {
	try {
		const data: GoogleLoginInput = req.body;
		const result = await authService.googleLogin(data);
		res.status(200).json({
			success: true,
			access_token: result.access_token,
			refresh_token: result.refresh_token,
			user: result.user
		});
	} catch (error: any) {
		res.status(401).json({
			success: false,
			message: error.message
		});
	}
};

export const refreshToken = async (req: Request, res: Response) => {
	try {
		const { refresh_token } = req.body;
		
		if (!refresh_token) {
			return res.status(400).json({
				success: false,
				message: 'Refresh token không được cung cấp'
			});
		}

		const result = await authService.refreshAccessToken(refresh_token);

		res.status(200).json({
			success: true,
			access_token: result.access_token,
			message: 'Token đã được làm mới'
		});
	} catch (error: any) {
		res.status(401).json({
			success: false,
			message: error.message
		});
	}
};

export const forgotPassword = async (req: Request, res: Response) => {
	try {
		const data: ForgotPasswordInput = req.body;

		const user_agent = req.header('User-Agent') || 'Unknown';
		let is_mobile = false;

		if(user_agent.includes('Mobile') || user_agent.includes('Android') || user_agent.includes('iPhone')) {
			is_mobile = true;
		}

		const result = await authService.forgotPassword(data, is_mobile);
		res.status(200).json({
			success: true,
			...result
		});
	} catch (error: any) {
		res.status(400).json({
			success: false,
			message: error.message
		});
	}
};

export const resetPassword = async (req: Request, res: Response) => {
	try {
		const data: ResetPasswordInput = req.body;
		const result = await authService.resetPassword(data);
		res.status(200).json({
			success: true,
			...result
		});
	} catch (error: any) {
		res.status(400).json({
			success: false,
			message: error.message
		});
	}
};

export const logout = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user.userId; // From auth middleware
		const { refresh_token } = req.body;
    
		if (!refresh_token) {
			return res.status(400).json({
				success: false,
				message: 'Refresh token không được để trống'
			});
		}

		const result = await authService.logout(userId, refresh_token);
		res.status(200).json({
			success: true,
			...result
		});
	} catch (error: any) {
		res.status(400).json({
			success: false,
			message: error.message
		});
	}
};

export const redirectResetPassword = async (req: Request, res: Response) => {
	const { token } = req.query;
	if (!token || typeof token !== 'string') {
		return res.status(400).json({
			success: false,
			message: 'Token không hợp lệ'
		});
	}

	const user_agent = req.header('User-Agent') || 'Unknown';
	const is_mobile = user_agent.includes('Mobile') || user_agent.includes('Android') || user_agent.includes('iPhone');

	try {
		const result = await authService.redirectResetPassword(token, is_mobile);
		
		res.redirect(result.redirectUrl);
	} catch (error: any) {
		let errorUrl = '';
		if (is_mobile) {
			errorUrl = `${process.env.MOBILE_APP_URL || 'myapp://'}auth/reset-password`;
		} else {
			errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`;
		}
		res.redirect(`${errorUrl}?success=false&message=${encodeURIComponent(error.message)}`);
	}
};

export const resetPasswordUser = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user.userId; // From auth middleware
		const { old_password, new_password } = req.body;

		if (!old_password || !new_password) {
			return res.status(400).json({
				success: false,
				message: 'Mật khẩu cũ và mật khẩu mới không được để trống'
			});
		}

		const result = await authService.resetPasswordUser(userId, old_password, new_password);
		res.status(200).json({
			success: true,
			...result
		});
	} catch (error: any) {
		res.status(400).json({
			success: false,
			message: error.message
		});
	}
};
    
