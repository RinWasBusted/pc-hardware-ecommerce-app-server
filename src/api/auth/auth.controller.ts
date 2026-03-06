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
		console.log('Register request body:', req.body); // Debug log
		const data: RegisterInput = req.body;
		const result = await authService.register(data);
		res.status(201).json(result);
	} catch (error: any) {
		res.status(400).json({ error: error.message });
	}
};

export const verifyEmail = async (req: Request, res: Response) => {
	try {
		const { token } = req.query;
		if (!token || typeof token !== 'string') {
			return res.status(400).json({ error: 'Token không hợp lệ' });
		}
		const result = await authService.verifyEmail(token);
		res.status(200).json(result);
	} catch (error: any) {
		res.status(400).json({ error: error.message });
	}
};

export const login = async (req: Request, res: Response) => {
	try {
		const data: LoginInput = req.body;
		const result = await authService.login(data);
		
		res.cookie('access_token', result.tokens.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 15 * 60 * 1000 // 15 minutes
		});

		res.cookie('refresh_token', result.tokens.refresh_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
		});

		res.status(200).json({
			user: result.user
		});
	} catch (error: any) {
		res.status(401).json({ error: error.message });
	}
};

export const googleLogin = async (req: Request, res: Response) => {
	try {
		const data: GoogleLoginInput = req.body;
		const result = await authService.googleLogin(data);
		res.status(200).json(result);
	} catch (error: any) {
		res.status(401).json({ error: error.message });
	}
};

export const refreshToken = async (req: Request, res: Response) => {
	try {
		const refreshToken = req.cookies?.refresh_token;
		
		if (!refreshToken) {
			return res.status(400).json({ error: 'Refresh token không được cung cấp' });
		}

		const result = await authService.refreshAccessToken(refreshToken);
		
		// Update access token in cookie
		res.cookie('access_token', result.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 15 * 60 * 1000 // 15 minutes
		});

		// Update refresh token in cookie if changed
		if (result.refresh_token) {
			res.cookie('refresh_token', result.refresh_token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'strict',
				maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
			});
		}

		res.status(200).json({ message: 'Token đã được làm mới' });
	} catch (error: any) {
		res.status(401).json({ error: error.message });
	}
};

export const forgotPassword = async (req: Request, res: Response) => {
	try {
		const data: ForgotPasswordInput = req.body;
		const result = await authService.forgotPassword(data);
		res.status(200).json(result);
	} catch (error: any) {
		res.status(400).json({ error: error.message });
	}
};

export const resetPassword = async (req: Request, res: Response) => {
	try {
		const data: ResetPasswordInput = req.body;
		const result = await authService.resetPassword(data);
		res.status(200).json(result);
	} catch (error: any) {
		res.status(400).json({ error: error.message });
	}
};

export const logout = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user.userId; // From auth middleware
		const { refresh_token } = req.body;
    
		if (!refresh_token) {
			return res.status(400).json({ error: 'Refresh token không được để trống' });
		}

		const result = await authService.logout(userId, refresh_token);
		res.status(200).json(result);
	} catch (error: any) {
		res.status(400).json({ error: error.message });
	}
};
    