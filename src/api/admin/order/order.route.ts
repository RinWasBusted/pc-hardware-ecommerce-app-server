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
