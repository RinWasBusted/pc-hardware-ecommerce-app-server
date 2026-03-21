import { Router } from 'express';
import { Authenticate } from '../../middleware/auth.middleware.js';
import { CreateMomoPaymentController, MomoIpnController, MomoReturnController } from './payment.controller.js';

const router = Router();

/**
 * @swagger
 * /payments/momo/ipn:
 *   post:
 *     summary: Webhook MoMo (IPN)
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: MoMo callback processed
 */
router.post('/momo/ipn', MomoIpnController);

/**
 * @swagger
 * /payments/momo/return:
 *   get:
 *     summary: Return URL từ MoMo
 *     tags:
 *       - Payments
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Return handled
 */
router.get('/momo/return', MomoReturnController);

router.use(Authenticate);

/**
 * @swagger
 * /payments/momo/create:
 *   post:
 *     summary: Tạo yêu cầu thanh toán MoMo cho đơn hàng
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *             properties:
 *               order_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Tạo giao dịch MoMo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/momo/create', CreateMomoPaymentController);

export default router;
