import { Router } from 'express';
import {
    getSystemNotifications,
    createSystemNotification
} from './notification.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/notifications:
 *   get:
 *     summary: Danh sách thông báo hệ thống (system)
 *     description: Lấy danh sách toàn bộ các thông báo có loại là system. **Chỉ admin**
 *     tags:
 *       - Admin Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang hiện tại
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số bản ghi trên mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách thông báo thành công
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 */
router.get('/', getSystemNotifications);

/**
 * @swagger
 * /admin/notifications:
 *   post:
 *     summary: Gửi thông báo hệ thống tới tất cả người dùng
 *     description: Tạo một thông báo loại system mới và phát tới tất cả người dùng đang hoạt động trong hệ thống qua SSE và FCM. **Chỉ admin**
 *     tags:
 *       - Admin Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *                 description: Tiêu đề của thông báo
 *                 example: "Thông báo bảo trì"
 *               body:
 *                 type: string
 *                 description: Nội dung chi tiết của thông báo
 *                 example: "Hệ thống sẽ tiến hành bảo trì định kỳ từ 1h - 3h sáng."
 *     responses:
 *       201:
 *         description: Tạo và gửi thông báo thành công
 *       400:
 *         description: Thiếu hoặc sai định dạng dữ liệu đầu vào
 *       401:
 *         description: Chưa xác thực
 *       403:
 *         description: Không có quyền truy cập
 */
router.post('/', createSystemNotification);

export default router;
