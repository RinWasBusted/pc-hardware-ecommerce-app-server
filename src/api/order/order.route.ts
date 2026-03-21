import { Router } from 'express';
import { Authenticate } from '../../middleware/auth.middleware.js';
import {
	CancelOrderController,
	ConfirmReceivedController,
	CreateOrderController,
	GetOrderDetailController,
	GetOrdersController,
} from './order.controller.js';

const router = Router();

router.use(Authenticate);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Tạo đơn hàng mới từ giỏ hàng
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address_id
 *               - payment_method
 *               - items
 *             properties:
 *               address_id:
 *                 type: integer
 *               coupon_id:
 *                 type: integer
 *               payment_method:
 *                 type: string
 *                 example: cod
 *               note:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - variant_id
 *                     - quantity
 *                   properties:
 *                     variant_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Tạo đơn hàng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', CreateOrderController);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Danh sách đơn hàng của tôi
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: order_status
 *         schema:
 *           type: string
 *       - in: query
 *         name: payment_status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách đơn hàng thành công
 */
router.get('/', GetOrdersController);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Chi tiết đơn hàng
 *     tags:
 *       - Orders
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
router.get('/:id', GetOrderDetailController);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   patch:
 *     summary: Hủy đơn hàng (chỉ khi status = pending)
 *     tags:
 *       - Orders
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
router.patch('/:id/cancel', CancelOrderController);

/**
 * @swagger
 * /orders/{id}/confirm-received:
 *   patch:
 *     summary: Xác nhận đã nhận hàng (khi status = delivered)
 *     tags:
 *       - Orders
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
 *         description: Xác nhận đã nhận hàng thành công
 */
router.patch('/:id/confirm-received', ConfirmReceivedController);

export default router;
