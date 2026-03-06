import { Resend } from 'resend';
import 'dotenv/config';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<void> => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@phamhoangthai.site',
      to,
      subject,
      html
    });

    if (response.error) {
      console.error('Resend API Error:', response.error);
      throw new Error(`Failed to send email: ${response.error.message}`);
    }
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error?.message || 'Unknown error'}`);
  }
};

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Xác thực tài khoản</h2>
      <p>Cảm ơn bạn đã đăng ký tài khoản tại PC Hardware Store.</p>
      <p>Vui lòng nhấn vào nút bên dưới để xác thực email của bạn:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; margin: 16px 0;">
        Xác thực email
      </a>
      <p>Hoặc copy link sau vào trình duyệt:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      <p>Link này sẽ hết hạn sau 24 giờ.</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px;">Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Xác thực tài khoản - PC Hardware Store',
    html
  });
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Đặt lại mật khẩu</h2>
      <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại PC Hardware Store.</p>
      <p>Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; margin: 16px 0;">
        Đặt lại mật khẩu
      </a>
      <p>Hoặc copy link sau vào trình duyệt:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <p>Link này sẽ hết hạn sau 24 giờ.</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Đặt lại mật khẩu - PC Hardware Store',
    html
  });
};
