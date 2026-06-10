import { Router } from 'express';
import { GetAdminPaymentsController } from './payment.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: Danh sách tất cả giao dịch thanh toán (Admin)
 *     description: Lấy danh sách lịch sử toàn bộ giao dịch thanh toán trong hệ thống có phân trang và lọc theo trạng thái, phương thức hoặc user_id. Chỉ dành cho Admin.
 *     tags:
 *       - Admin Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Số trang hiện tại.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Số phần tử trên mỗi trang.
 *       - in: query
 *         name: payment_status
 *         schema:
 *           type: string
 *           enum: [pending, success, failed, refunded]
 *         description: Lọc theo trạng thái thanh toán.
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [cod, bank_transfer]
 *         description: Lọc theo phương thức thanh toán.
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Lọc theo ID người đặt hàng.
 *     responses:
 *       200:
 *         description: Lấy danh sách giao dịch thành công
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
 *                       order_id:
 *                         type: integer
 *                       method:
 *                         type: string
 *                         enum: [cod, bank_transfer]
 *                       amount:
 *                         type: number
 *                       transaction_id:
 *                         type: string
 *                         nullable: true
 *                       gateway_response:
 *                         type: object
 *                         nullable: true
 *                       payment_status:
 *                         type: string
 *                         enum: [pending, success, failed, refunded]
 *                       paid_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       order:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           total:
 *                             type: number
 *                           order_status:
 *                             type: string
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               full_name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       400:
 *         description: Tham số đầu vào không hợp lệ
 *       401:
 *         description: Token không được cung cấp hoặc không hợp lệ
 *       403:
 *         description: Không có quyền truy cập (không phải Admin)
 */
router.get('/', GetAdminPaymentsController);

export default router;
