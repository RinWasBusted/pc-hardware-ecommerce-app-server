import { Router } from 'express';
import {
	CancelAdminOrderController,
	GetAdminOrderDetailController,
	GetAdminOrdersController,
	GetAdminOrderStatusLogsController,
	UpdateAdminOrderStatusController,
} from './order.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: Danh sách tất cả đơn hàng
 *     description: Lấy danh sách đơn hàng với bộ lọc status, payment_status, user_id, date_from, date_to, search. **Chỉ admin**
 *     tags:
 *       - Admin Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: payment_status
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_id
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date_from
 *         required: false
 *         schema:
 *           type: string
 *           example: 2024-01-01
 *       - in: query
 *         name: date_to
 *         required: false
 *         schema:
 *           type: string
 *           example: 2024-01-31
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách đơn hàng thành công
 */
router.get('/', GetAdminOrdersController);

/**
 * @swagger
 * /admin/orders/{id}:
 *   get:
 *     summary: Chi tiết đơn hàng
 *     description: Lấy chi tiết đơn hàng cho admin. Response là superset của API `/orders/{id}` của user và có thêm thông tin người đặt hàng.
 *     tags:
 *       - Admin Orders
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
 *         description: Lấy chi tiết đơn hàng thành công
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
 *                     user:
 *                       type: object
 *                       description: Thông tin người đặt hàng, chỉ admin mới thấy.
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 12
 *                         full_name:
 *                           type: string
 *                           example: Nguyen Van A
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                         phone_number:
 *                           type: string
 *                           nullable: true
 *                           example: "0901234567"
 *                     subtotal:
 *                       type: number
 *                       example: 25000000
 *                     discount_amount:
 *                       type: number
 *                       example: 1000000
 *                     shipping_fee:
 *                       type: number
 *                       example: 30000
 *                     total:
 *                       type: number
 *                       example: 24030000
 *                     payment_method:
 *                       type: string
 *                       enum: [cod, bank_transfer]
 *                       example: bank_transfer
 *                     payment_status:
 *                       type: string
 *                       enum: [unpaid, paid, refunded]
 *                       example: paid
 *                     order_status:
 *                       type: string
 *                       enum: [pending, confirmed, preparing, packed, shipping, delivered, received, failed, cancelled]
 *                       example: confirmed
 *                     cancel_reason:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     note:
 *                       type: string
 *                       nullable: true
 *                       example: "Giao giờ hành chính"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                     address:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         recipient:
 *                           type: string
 *                         phone_number:
 *                           type: string
 *                         province:
 *                           type: string
 *                         district:
 *                           type: string
 *                         ward:
 *                           type: string
 *                         street:
 *                           type: string
 *                         province_id:
 *                           type: integer
 *                           nullable: true
 *                         district_id:
 *                           type: integer
 *                           nullable: true
 *                         ward_code:
 *                           type: string
 *                           nullable: true
 *                     coupon:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: integer
 *                         code:
 *                           type: string
 *                         discount_type:
 *                           type: string
 *                           enum: [percent, fixed]
 *                         discount_value:
 *                           type: number
 *                         min_order_value:
 *                           type: number
 *                           nullable: true
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           variant_id:
 *                             type: integer
 *                           quantity:
 *                             type: integer
 *                           unit_price:
 *                             type: number
 *                           subtotal:
 *                             type: number
 *                           product:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                           variant:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               sku:
 *                                 type: string
 *                               version:
 *                                 type: string
 *                                 nullable: true
 *                               color:
 *                                 type: string
 *                                 nullable: true
 *                               color_hex:
 *                                 type: string
 *                                 nullable: true
 *                           image_url:
 *                             type: string
 *                             nullable: true
 *                     timeline:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           old_status:
 *                             type: string
 *                             enum: [pending, confirmed, preparing, packed, shipping, delivered, received, failed, cancelled]
 *                           new_status:
 *                             type: string
 *                             enum: [pending, confirmed, preparing, packed, shipping, delivered, received, failed, cancelled]
 *                           note:
 *                             type: string
 *                             nullable: true
 *                           changed_at:
 *                             type: string
 *                             format: date-time
 *                           changed_by:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               full_name:
 *                                 type: string
 *                               role:
 *                                 type: string
 *                                 enum: [customer, admin]
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc đơn hàng không tồn tại
 */
router.get('/:id', GetAdminOrderDetailController);

/**
 * @swagger
 * /admin/orders/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái đơn hàng
 *     tags:
 *       - Admin Orders
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
 *               - order_status
 *             properties:
 *               order_status:
 *                 type: string
 *                 example: confirmed
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 */
router.patch('/:id/status', UpdateAdminOrderStatusController);

/**
 * @swagger
 * /admin/orders/{id}/cancel:
 *   patch:
 *     summary: Hủy đơn hàng (Admin, có lý do)
 *     tags:
 *       - Admin Orders
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
 *               - cancel_reason
 *             properties:
 *               cancel_reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hủy đơn hàng thành công
 */
router.patch('/:id/cancel', CancelAdminOrderController);

/**
 * @swagger
 * /admin/orders/{id}/status-logs:
 *   get:
 *     summary: Lịch sử thay đổi trạng thái đơn hàng
 *     tags:
 *       - Admin Orders
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
 *         description: Lấy lịch sử trạng thái thành công
 */
router.get('/:id/status-logs', GetAdminOrderStatusLogsController);

export default router;
