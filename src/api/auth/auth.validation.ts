import { z } from 'zod';

export const registerSchema = z.object({
  full_name: z.string().min(1, 'Họ tên không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  phone_number: z.string().optional(),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  address: z.object({
    recipient: z.string(),
    phone_number: z.string(),
    province: z.string(),
    district: z.string(),
    ward: z.string(),
    street: z.string(),
    is_default: z.boolean().default(true)
  }).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được để trống')
});

export const googleLoginSchema = z.object({
  id_token: z.string().min(1, 'ID token không được để trống')
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token không được để trống')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token không được để trống'),
  new_password: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
});

export const resetPasswordUserSchema = z.object({
  old_password: z.string().min(1, 'Mật khẩu cũ không được để trống'),
  new_password: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token không được để trống')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordUserInput = z.infer<typeof resetPasswordUserSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
