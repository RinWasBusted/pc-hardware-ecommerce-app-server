import { Router } from 'express';
import { Authenticate } from '../../middleware/auth.middleware.js';
import { createPayment, webhook } from './payment.controller.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Payment
 *     description: Payment and PayOS transaction APIs
 */

/**
 * @swagger
 * /payments/webhook:
 *   post:
 *     summary: Nhận webhook thanh toán từ PayOS
 *     description: Endpoint để PayOS gửi trạng thái thanh toán về server và đồng bộ trạng thái payment/order.
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - desc
 *               - success
 *               - data
 *               - signature
 *             properties:
 *               code:
 *                 type: string
 *                 description: Mã phản hồi của PayOS cho webhook.
 *                 example: "00"
 *               desc:
 *                 type: string
 *                 description: Mô tả phản hồi webhook từ PayOS.
 *                 example: "success"
 *               success:
 *                 type: boolean
 *                 description: Kết quả xử lý webhook phía PayOS.
 *                 example: true
 *               data:
 *                 type: object
 *                 required:
 *                   - orderCode
 *                   - amount
 *                   - description
 *                   - accountNumber
 *                   - reference
 *                   - transactionDateTime
 *                   - currency
 *                   - paymentLinkId
 *                   - code
 *                   - desc
 *                 properties:
 *                   orderCode:
 *                     type: integer
 *                     description: Mã payment nội bộ được truyền sang PayOS.
 *                     example: 12345
 *                   amount:
 *                     type: number
 *                     description: Số tiền giao dịch.
 *                     example: 500000
 *                   description:
 *                     type: string
 *                     description: Nội dung thanh toán.
 *                     example: "DH1-TT12345"
 *                   accountNumber:
 *                     type: string
 *                     description: Số tài khoản nhận tiền.
 *                     example: "1234567890"
 *                   reference:
 *                     type: string
 *                     description: Mã tham chiếu giao dịch.
 *                     example: "FT25123456789"
 *                   transactionDateTime:
 *                     type: string
 *                     format: date-time
 *                     description: Thời gian phát sinh giao dịch.
 *                     example: "2026-05-20T10:30:00Z"
 *                   currency:
 *                     type: string
 *                     description: Loại tiền tệ.
 *                     example: "VND"
 *                   paymentLinkId:
 *                     type: string
 *                     description: ID payment link phía PayOS.
 *                     example: "plink_123456"
 *                   code:
 *                     type: string
 *                     description: Mã trạng thái giao dịch trong `data`.
 *                     example: "00"
 *                   desc:
 *                     type: string
 *                     description: Mô tả trạng thái giao dịch trong `data`.
 *                     example: "Thành công"
 *                   counterAccountBankId:
 *                     type: string
 *                     nullable: true
 *                     description: Mã ngân hàng tài khoản chuyển tiền.
 *                     example: "VCB"
 *                   counterAccountBankName:
 *                     type: string
 *                     nullable: true
 *                     description: Tên ngân hàng tài khoản chuyển tiền.
 *                     example: "Vietcombank"
 *                   counterAccountName:
 *                     type: string
 *                     nullable: true
 *                     description: Tên chủ tài khoản chuyển tiền.
 *                     example: "NGUYEN VAN A"
 *                   counterAccountNumber:
 *                     type: string
 *                     nullable: true
 *                     description: Số tài khoản chuyển tiền.
 *                     example: "9876543210"
 *                   virtualAccountName:
 *                     type: string
 *                     nullable: true
 *                     description: Tên tài khoản ảo.
 *                     example: "PC HARDWARE STORE"
 *                   virtualAccountNumber:
 *                     type: string
 *                     nullable: true
 *                     description: Số tài khoản ảo.
 *                     example: "0123456789"
 *               signature:
 *                 type: string
 *                 description: Chữ ký dùng để xác minh webhook.
 *                 example: "2a8dfc64d1f5..."
 *     responses:
 *       200:
 *         description: Webhook được xác minh và đồng bộ trạng thái thành công
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
 *                     order_id:
 *                       type: integer
 *                       example: 1
 *                     payment_id:
 *                       type: integer
 *                       example: 12345
 *                     payment_status:
 *                       type: string
 *                       enum: [pending, success, failed]
 *                       example: "success"
 *                     payosStatus:
 *                       type: string
 *                       enum: [PENDING, PROCESSING, PAID, FAILED, CANCELLED, EXPIRED, UNDERPAID]
 *                       example: "PAID"
 *       400:
 *         description: Webhook không hợp lệ hoặc không thể xử lý
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "orderCode PayOS không hợp lệ"
 */
router.post('/webhook', webhook);

/**
 * @swagger
 * /payments/orders/{orderId}:
 *   post:
 *     summary: Tạo payment link PayOS cho đơn hàng
 *     description: Tạo link thanh toán cho đơn hàng của người dùng đang đăng nhập. Chỉ áp dụng cho đơn hàng dùng `bank_transfer` và chưa thanh toán.
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         description: ID đơn hàng cần tạo payment link.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *     responses:
 *       201:
 *         description: Tạo payment link thành công
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
 *                     payment_id:
 *                       type: integer
 *                       description: ID payment được tạo trong hệ thống.
 *                       example: 12345
 *                     order_id:
 *                       type: integer
 *                       description: ID đơn hàng tương ứng.
 *                       example: 1
 *                     paymentUrl:
 *                       type: string
 *                       format: uri
 *                       description: Link thanh toán để chuyển người dùng sang PayOS.
 *                       example: "https://pay.payos.vn/web/123456789"
 *                     paymentData:
 *                       type: object
 *                       description: Dữ liệu chi tiết do PayOS trả về.
 *                       properties:
 *                         bin:
 *                           type: string
 *                           example: "970436"
 *                         accountNumber:
 *                           type: string
 *                           example: "1234567890"
 *                         accountName:
 *                           type: string
 *                           example: "PC HARDWARE STORE"
 *                         amount:
 *                           type: number
 *                           example: 500000
 *                         description:
 *                           type: string
 *                           example: "DH1-TT12345"
 *                         orderCode:
 *                           type: integer
 *                           example: 12345
 *                         currency:
 *                           type: string
 *                           example: "VND"
 *                         paymentLinkId:
 *                           type: string
 *                           example: "plink_123456"
 *                         status:
 *                           type: string
 *                           enum: [PENDING, PROCESSING, PAID, FAILED, CANCELLED, EXPIRED, UNDERPAID]
 *                           example: "PENDING"
 *                         checkoutUrl:
 *                           type: string
 *                           format: uri
 *                           example: "https://pay.payos.vn/web/123456789"
 *                         qrCode:
 *                           type: string
 *                           description: Dữ liệu QR do PayOS trả về.
 *                           example: "000201010212..."
 *       400:
 *         description: Không thể tạo payment link
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     order_not_found:
 *                       value: "Đơn hàng không tồn tại"
 *                     invalid_method:
 *                       value: "Đơn hàng không sử dụng phương thức thanh toán chuyển khoản"
 *                     already_paid:
 *                       value: "Đơn hàng đã được thanh toán"
 *                     cancelled_order:
 *                       value: "Đơn hàng đã bị hủy hoặc thất bại"
 *                     gateway_error:
 *                       value: "Không thể tạo thanh toán PayOS"
 *       401:
 *         description: Người dùng chưa đăng nhập hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_token:
 *                       value: "Token không được cung cấp"
 *                     invalid_token:
 *                       value: "Token không hợp lệ hoặc đã hết hạn"
 */
router.post('/orders/:orderId', Authenticate, createPayment);

export default router;
