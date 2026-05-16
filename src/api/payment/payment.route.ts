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
 * /payment/webhook:
 *   post:
 *     summary: PayOS Webhook Handler
 *     description: Webhook endpoint để nhận thông báo từ PayOS về trạng thái thanh toán. Endpoint này được PayOS gọi để cập nhật trạng thái đơn hàng khi thanh toán thay đổi.
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderCode:
 *                 type: number
 *                 description: Mã thanh toán (Payment ID)
 *                 example: 12345
 *               amount:
 *                 type: number
 *                 description: Số tiền thanh toán
 *                 example: 500000
 *               description:
 *                 type: string
 *                 description: Mô tả đơn hàng
 *                 example: "DH1-TT12345"
 *               accountNumber:
 *                 type: string
 *                 description: Số tài khoản người nhận
 *                 example: "1234567890"
 *               reference:
 *                 type: string
 *                 description: Mã tham chiếu giao dịch
 *                 example: "QR241234567"
 *               transactionDateTime:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian giao dịch
 *                 example: "2026-05-16T10:30:00Z"
 *               counterAccountBankId:
 *                 type: string
 *                 description: ID ngân hàng của người gửi
 *                 example: "VCOMBANK"
 *               counterAccountBankName:
 *                 type: string
 *                 description: Tên ngân hàng của người gửi
 *                 example: "Ngân hàng Việt Cộng Hòa"
 *               counterAccountName:
 *                 type: string
 *                 description: Tên tài khoản người gửi
 *                 example: "NGUYEN VAN A"
 *               counterAccountNumber:
 *                 type: string
 *                 description: Số tài khoản người gửi
 *                 example: "9876543210"
 *               virtualAccountName:
 *                 type: string
 *                 description: Tên tài khoản ảo
 *                 example: "PC HARDWARE STORE"
 *               virtualAccountNumber:
 *                 type: string
 *                 description: Số tài khoản ảo
 *                 example: "1234567890"
 *               code:
 *                 type: string
 *                 description: Mã trạng thái
 *                 example: "00"
 *               message:
 *                 type: string
 *                 description: Thông báo trạng thái
 *                 example: "Success"
 *               signature:
 *                 type: string
 *                 description: Chữ ký HMAC để xác minh webhook
 *                 example: "sig_12345..."
 *     responses:
 *       200:
 *         description: Webhook xử lý thành công
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
 *                       type: number
 *                       description: ID đơn hàng
 *                       example: 1
 *                     payment_id:
 *                       type: number
 *                       description: ID giao dịch thanh toán
 *                       example: 12345
 *                     payment_status:
 *                       type: string
 *                       enum: [pending, success, failed]
 *                       description: Trạng thái thanh toán
 *                       example: "success"
 *                     payosStatus:
 *                       type: string
 *                       enum: [PENDING, PROCESSING, PAID, FAILED, CANCELLED, EXPIRED, UNDERPAID]
 *                       description: Trạng thái từ PayOS
 *                       example: "PAID"
 *       400:
 *         description: Lỗi xử lý webhook
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
 *                   description: Mô tả lỗi
 *                   example: "orderCode PayOS không hợp lệ"
 */
router.post('/webhook', webhook);

/**
 * @swagger
 * /payment/orders/{orderId}:
 *   post:
 *     summary: Tạo Payment Link từ PayOS
 *     description: Tạo link thanh toán PayOS cho đơn hàng. Yêu cầu user đã đăng nhập (Authenticate). Đơn hàng phải sử dụng phương thức thanh toán chuyển khoản và chưa được thanh toán.
 *     tags: [Payment]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: number
 *         description: ID của đơn hàng cần thanh toán
 *         example: 1
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
 *                       type: number
 *                       description: ID giao dịch thanh toán vừa tạo
 *                       example: 12345
 *                     order_id:
 *                       type: number
 *                       description: ID đơn hàng
 *                       example: 1
 *                     paymentUrl:
 *                       type: string
 *                       format: uri
 *                       description: URL checkout trên PayOS để người dùng thanh toán
 *                       example: "https://pay.payos.vn/checkout?token=abc123xyz..."
 *                     paymentData:
 *                       type: object
 *                       description: Chi tiết thông tin thanh toán từ PayOS
 *                       properties:
 *                         id:
 *                           type: string
 *                           description: Payment link ID từ PayOS
 *                           example: "pl_12345"
 *                         orderCode:
 *                           type: number
 *                           description: Order code
 *                           example: 12345
 *                         amount:
 *                           type: number
 *                           description: Số tiền
 *                           example: 500000
 *                         amountPaid:
 *                           type: number
 *                           description: Số tiền đã thanh toán
 *                           example: 0
 *                         amountRemaining:
 *                           type: number
 *                           description: Số tiền còn lại
 *                           example: 500000
 *                         status:
 *                           type: string
 *                           enum: [PENDING, PROCESSING, PAID, FAILED, CANCELLED, EXPIRED, UNDERPAID]
 *                           description: Trạng thái thanh toán
 *                           example: "PENDING"
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: Thời gian tạo
 *                           example: "2026-05-16T10:30:00Z"
 *                         expiredAt:
 *                           type: string
 *                           format: date-time
 *                           description: Thời gian hết hạn
 *                           example: "2026-05-23T10:30:00Z"
 *                         checkoutUrl:
 *                           type: string
 *                           format: uri
 *                           description: URL checkout
 *                           example: "https://pay.payos.vn/checkout?token=abc123xyz..."
 *                         transactions:
 *                           type: array
 *                           description: Danh sách các giao dịch
 *                           items:
 *                             type: object
 *                             properties:
 *                               reference:
 *                                 type: string
 *                                 description: Mã tham chiếu giao dịch
 *                                 example: "QR241234567"
 *                               amount:
 *                                 type: number
 *                                 description: Số tiền giao dịch
 *                                 example: 500000
 *                               accountNumber:
 *                                 type: string
 *                                 description: Số tài khoản
 *                                 example: "1234567890"
 *                               description:
 *                                 type: string
 *                                 description: Mô tả giao dịch
 *                                 example: "DH1-TT12345"
 *                               transactionDateTime:
 *                                 type: string
 *                                 format: date-time
 *                                 description: Thời gian giao dịch
 *                                 example: "2026-05-16T11:00:00Z"
 *       400:
 *         description: Lỗi tạo payment link
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
 *                   description: Mô tả lỗi
 *                   examples:
 *                     - "Đơn hàng không tồn tại"
 *                     - "Đơn hàng không sử dụng phương thức thanh toán chuyển khoản"
 *                     - "Đơn hàng đã được thanh toán"
 *                     - "Đơn hàng đã bị hủy hoặc thất bại"
 *                     - "Không thể tạo thanh toán PayOS"
 *       401:
 *         description: Không được xác thực hoặc người dùng ID không hợp lệ
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
 *                   example: "Không xác định được người dùng"
 */
router.post('/orders/:orderId', Authenticate, createPayment);

export default router;
