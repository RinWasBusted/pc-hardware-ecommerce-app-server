import Router from 'express';
import * as authController from './auth.controller.js';
import {
    registerSchema,
    loginSchema,
    googleLoginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema
} from './auth.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { Authenticate } from '../../middleware/auth.middleware.js';

export const authRouter = Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication APIs
 */

// Public routes
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     description: Tạo tài khoản mới. Email xác thực sẽ được gửi để verify tài khoản.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, email, password]
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               phone_number:
 *                 type: string
 *                 example: "0812345678"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "password123"
 *               address:
 *                 type: object
 *                 properties:
 *                   recipient:
 *                     type: string
 *                     example: "Nguyễn Văn A"
 *                   phone_number:
 *                     type: string
 *                     example: "0812345678"
 *                   province:
 *                     type: string
 *                     example: "Hà Nội"
 *                   district:
 *                     type: string
 *                     example: "Quận Đống Đa"
 *                   ward:
 *                     type: string
 *                     example: "Phường Văn Chương"
 *                   street:
 *                     type: string
 *                     example: "123 Đường ABC"
 *                   is_default:
 *                     type: boolean
 *                     example: true
 *     responses:
 *       201:
 *         description: Đăng ký thành công. Kiểm tra email để xác thực tài khoản.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản."
 *       400:
 *         description: Lỗi xác thực hoặc email đã tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email đã được sử dụng"
 */
authRouter.post('/register', validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/verify-email:
 *   get:
 *     summary: Xác thực email
 *     description: Xác thực email người dùng bằng token được gửi qua email
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token xác thực email
 *         example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Xác thực email thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xác thực email thành công"
 *       400:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token không hợp lệ hoặc đã hết hạn"
 */
authRouter.get('/verify-email', authController.verifyEmail);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Đăng nhập bằng email và mật khẩu
 *     description: Đăng nhập với email và mật khẩu. Access Token và Refresh Token sẽ được lưu trong cookie.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: Access Token để sử dụng trong Authorization header
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refresh_token:
 *                   type: string
 *                   description: Refresh Token để lấy access token mới
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     full_name:
 *                       type: string
 *                       example: "Nguyễn Văn A"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     role:
 *                       type: string
 *                       enum: [customer, admin]
 *                       example: "customer"
 *       401:
 *         description: Email hoặc mật khẩu không đúng, hoặc tài khoản chưa verify
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email hoặc mật khẩu không đúng"
 */
authRouter.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Đăng nhập / Đăng ký qua Google OAuth
 *     description: Xác thực với Google ID token. Tạo tài khoản mới nếu email không tồn tại.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_token]
 *             properties:
 *               id_token:
 *                 type: string
 *                 description: Google ID Token từ Google Sign-In
 *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ..."
 *     responses:
 *       200:
 *         description: Đăng nhập / Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: Access Token để sử dụng trong Authorization header
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refresh_token:
 *                   type: string
 *                   description: Refresh Token để lấy access token mới
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     full_name:
 *                       type: string
 *                       example: "Nguyễn Văn B"
 *                     email:
 *                       type: string
 *                       example: "user@gmail.com"
 *                     role:
 *                       type: string
 *                       example: "customer"
 *       401:
 *         description: ID token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "ID token không hợp lệ"
 */
authRouter.post('/google', validate(googleLoginSchema), authController.googleLogin);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Làm mới Access Token
 *     description: Lấy Access Token mới từ Refresh Token. Gửi refresh token trong request body.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Refresh Token từ đăng nhập hoặc refresh token trước đó
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Lấy Access Token mới thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: Access Token mới
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refresh_token:
 *                   type: string
 *                   description: Refresh Token mới
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "Token đã được làm mới"
 *       400:
 *         description: Refresh Token không được cung cấp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Refresh token không được cung cấp"
 *       401:
 *         description: Refresh Token không hợp lệ hoặc đã hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token không hợp lệ hoặc đã hết hạn"
 */
authRouter.post('/refresh', authController.refreshToken);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Gửi email reset mật khẩu
 *     description: Gửi email reset mật khẩu đến địa chỉ email được cung cấp
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Email reset mật khẩu đã được gửi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email reset mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư."
 *       400:
 *         description: Email không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email không tồn tại"
 */
authRouter.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu mới
 *     description: Sử dụng token từ email reset để đặt mật khẩu mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, new_password]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token reset password từ email
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *                 description: Mật khẩu mới (tối thiểu 8 ký tự)
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Đặt lại mật khẩu thành công"
 *       400:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token không hợp lệ hoặc đã hết hạn"
 */
authRouter.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

// Protected route
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     description: Đăng xuất tài khoản hiện tại. Cần xác thực bằng Access Token (Authorization header).
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Refresh Token cần được invalidate khi đăng xuất
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Đăng xuất thành công"
 *       400:
 *         description: Refresh Token không được cung cấp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Refresh token không được để trống"
 *       401:
 *         description: Không được xác thực
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token không được cung cấp"
 */
authRouter.post('/logout', Authenticate, authController.logout);