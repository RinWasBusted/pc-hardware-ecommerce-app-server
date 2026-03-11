import { Router } from 'express';
import { GetMe, UpdateMe, ChangePasswordMe, GetMyAddresses, AddAddress, UpdateMyAddress, DeleteMyAddress, SetMyDefaultAddress, UpdateMyAvatar } from './user.controller.js';
import { Authenticate } from '../../middleware/auth.middleware.js';
import { uploadSingle } from '../../utils/multer.js';

const router = Router();

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Lấy thông tin tài khoản hiện tại
 *     description: Lấy thông tin profile của người dùng đang đăng nhập. **Yêu cầu Bearer Token**
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     full_name:
 *                       type: string
 *                       example: "Nguyen Van A"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     phone_number:
 *                       type: string
 *                       nullable: true
 *                       example: "0123456789"
 *                     avatar_url:
 *                       type: string
 *                       nullable: true
 *                       example: "https://example.com/avatar.jpg"
 *                     setting:
 *                       type: object
 *                       nullable: true
 *                       example: {}
 *                     role:
 *                       type: string
 *                       enum: [customer, admin]
 *                       example: "customer"
 *       401:
 *         description: Token không được cung cấp hoặc không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token không được cung cấp"
 *       400:
 *         description: Lỗi server
 */
router.get('/me', Authenticate, GetMe);

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Cập nhật thông tin cá nhân
 *     description: Cập nhật thông tin profile của người dùng (fullname, phone_number, setting). **Yêu cầu Bearer Token**
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 description: Họ và tên
 *                 example: "Nguyen Van B"
 *               phone_number:
 *                 type: string
 *                 description: Số điện thoại
 *                 example: "0987654321"
 *               setting:
 *                 type: object
 *                 description: Cài đặt người dùng
 *                 example: { "theme": "dark", "notifications": true }
 *     responses:
 *       200:
 *         description: Cập nhật thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     full_name:
 *                       type: string
 *                       example: "Nguyen Van B"
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     phone_number:
 *                       type: string
 *                       nullable: true
 *                       example: "0987654321"
 *                     avatar_url:
 *                       type: string
 *                       nullable: true
 *                       example: "https://example.com/avatar.jpg"
 *                     setting:
 *                       type: object
 *                       nullable: true
 *                       example: { "theme": "dark", "notifications": true }
 *                     role:
 *                       type: string
 *                       enum: [customer, admin]
 *                       example: "customer"
 *                 message:
 *                   type: string
 *                   example: "Cập nhật thông tin cá nhân thành công"
 *       401:
 *         description: Token không được cung cấp hoặc không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token không hợp lệ hoặc đã hết hạn"
 *       400:
 *         description: Lỗi server hoặc validation
 */
router.put('/me', Authenticate, UpdateMe);

/**
 * @swagger
 * /users/me/avatar:
 *   patch:
 *     summary: Cập nhật avatar người dùng
 *     description: Upload ảnh avatar mới để cập nhật; nếu không gửi file avatar thì hệ thống sẽ xóa avatar hiện tại. **Yêu cầu Bearer Token**
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật avatar thành công
 *       400:
 *         description: Upload thất bại
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 */
router.patch('/me/avatar', Authenticate, uploadSingle('avatar'), UpdateMyAvatar);

/**
 * @swagger
 * /users/me/password:
 *   put:
 *     summary: Đổi mật khẩu
 *     description: Đổi mật khẩu của người dùng đang đăng nhập. **Yêu cầu Bearer Token**
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - old_password
 *               - new_password
 *             properties:
 *               old_password:
 *                 type: string
 *                 description: Mật khẩu hiện tại
 *                 example: "password123"
 *               new_password:
 *                 type: string
 *                 description: Mật khẩu mới
 *                 example: "newPassword456"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Đổi mật khẩu thành công"
 *       400:
 *         description: Lỗi validation hoặc mật khẩu cũ không đúng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Mật khẩu hiện tại không đúng"
 *       401:
 *         description: Token không được cung cấp hoặc không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token không hợp lệ hoặc đã hết hạn"
 */
router.put('/me/password', Authenticate, ChangePasswordMe);

/**
 * @swagger
 * /users/me/addresses:
 *   get:
 *     summary: Lấy danh sách địa chỉ
 *     description: Lấy tất cả địa chỉ của người dùng. **Yêu cầu Bearer Token**
 *     tags:
 *       - User Addresses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 1
 *                       recipient:
 *                         type: string
 *                         example: "Nguyen Van A"
 *                       phone_number:
 *                         type: string
 *                         example: "0123456789"
 *                       province:
 *                         type: string
 *                         example: "Hà Nội"
 *                       district:
 *                         type: string
 *                         example: "Hoàn Kiếm"
 *                       ward:
 *                         type: string
 *                         example: "Hàng Trống"
 *                       street:
 *                         type: string
 *                         example: "123 Đường A"
 *                       is_default:
 *                         type: boolean
 *                         example: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Token không được cung cấp hoặc không hợp lệ
 */
router.get('/me/addresses', Authenticate, GetMyAddresses);

/**
 * @swagger
 * /users/me/addresses:
 *   post:
 *     summary: Thêm địa chỉ mới
 *     description: Tạo một địa chỉ mới cho người dùng. `is_default` không nhận từ request; address đầu tiên sẽ tự động là mặc định, các address sau mặc định là `false`. **Yêu cầu Bearer Token**
 *     tags:
 *       - User Addresses
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient
 *               - phone_number
 *               - province
 *               - district
 *               - ward
 *               - street
 *             properties:
 *               recipient:
 *                 type: string
 *                 description: Tên người nhận
 *                 example: "Nguyen Van A"
 *               phone_number:
 *                 type: string
 *                 description: Số điện thoại người nhận
 *                 example: "0123456789"
 *               province:
 *                 type: string
 *                 description: Tỉnh / Thành phố
 *                 example: "Hà Nội"
 *               district:
 *                 type: string
 *                 description: Phường
 *                 example: "Hoàn Kiếm"
 *               ward:
 *                 type: string
 *                 description: Xã
 *                 example: "Hàng Trống"
 *               street:
 *                 type: string
 *                 description: Số nhà, tên đường
 *                 example: "123 Đường A"
 *     responses:
 *       201:
 *         description: Thêm địa chỉ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     user_id:
 *                       type: integer
 *                     recipient:
 *                       type: string
 *                     phone_number:
 *                       type: string
 *                     province:
 *                       type: string
 *                     district:
 *                       type: string
 *                     ward:
 *                       type: string
 *                     street:
 *                       type: string
 *                     is_default:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: "Thêm địa chỉ thành công"
 *       400:
 *         description: Lỗi validation
 *       401:
 *         description: Token không được cung cấp hoặc không hợp lệ
 */
router.post('/me/addresses', Authenticate, AddAddress);

/**
 * @swagger
 * /users/me/addresses/{id}:
 *   put:
 *     summary: Cập nhật địa chỉ
 *     description: Cập nhật thông tin địa chỉ. **Yêu cầu Bearer Token**
 *     tags:
 *       - User Addresses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID địa chỉ
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipient:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               province:
 *                 type: string
 *               district:
 *                 type: string
 *               ward:
 *                 type: string
 *               street:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật địa chỉ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: "Cập nhật địa chỉ thành công"
 *       400:
 *         description: Lỗi validation hoặc địa chỉ không tồn tại
 *       401:
 *         description: Token không được cung cấp hoặc không hợp lệ
 */
router.put('/me/addresses/:id', Authenticate, UpdateMyAddress);

/**
 * @swagger
 * /users/me/addresses/{id}:
 *   delete:
 *     summary: Xóa địa chỉ
 *     description: Xóa một địa chỉ của người dùng. **Yêu cầu Bearer Token**
 *     tags:
 *       - User Addresses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID địa chỉ
 *     responses:
 *       200:
 *         description: Xóa địa chỉ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Xóa địa chỉ thành công"
 *       400:
 *         description: Lỗi validation hoặc địa chỉ không tồn tại
 *       401:
 *         description: Token không được cung cấp hoặc không hợp lệ
 */
router.delete('/me/addresses/:id', Authenticate, DeleteMyAddress);

/**
 * @swagger
 * /users/me/addresses/{id}/default:
 *   patch:
 *     summary: Đặt làm địa chỉ mặc định
 *     description: Đặt một địa chỉ làm địa chỉ mặc định (các địa chỉ khác sẽ tự động không phải mặc định). **Yêu cầu Bearer Token**
 *     tags:
 *       - User Addresses
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID địa chỉ
 *     responses:
 *       200:
 *         description: Đặt làm địa chỉ mặc định thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *                   example: "Đặt làm địa chỉ mặc định thành công"
 *       400:
 *         description: Lỗi validation hoặc địa chỉ không tồn tại
 *       401:
 *         description: Token không được cung cấp hoặc không hợp lệ
 */
router.patch('/me/addresses/:id/default', Authenticate, SetMyDefaultAddress);

export default router;
