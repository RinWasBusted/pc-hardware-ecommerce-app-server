import { Router } from 'express';
import {
	GetUsersController,
	GetUserDetailController,
	UpdateUserStatusController,
} from './user.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Danh sách người dùng
 *     description: Lấy danh sách người dùng với bộ lọc role, is_active, search. **Chỉ admin**
 *     tags:
 *       - Admin Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *           enum: [customer, admin]
 *       - in: query
 *         name: is_active
 *         required: false
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/', GetUsersController);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Chi tiết người dùng
 *     description: Lấy thông tin chi tiết của một người dùng theo id. **Chỉ admin**
 *     tags:
 *       - Admin Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *       400:
 *         description: ID không hợp lệ hoặc không tìm thấy người dùng
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/:id', GetUserDetailController);

/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Khóa / Mở khóa tài khoản
 *     description: Cập nhật trạng thái hoạt động của tài khoản người dùng. **Chỉ admin**
 *     tags:
 *       - Admin Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: true = mở khóa, false = khóa tài khoản
 *                 example: false
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc không tìm thấy người dùng
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 */
router.patch('/:id/status', UpdateUserStatusController);

export default router;
