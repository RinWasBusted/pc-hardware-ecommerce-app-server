import { Router } from 'express';
import {
	ApproveAdminReturnRequestController,
	CompleteAdminReturnRequestController,
	GetAdminReturnRequestDetailController,
	GetAdminReturnRequestsController,
	MarkAdminReturnRequestReceivedController,
	RejectAdminReturnRequestController,
} from './return-request.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/return-requests:
 *   get:
 *     summary: Danh sách tất cả yêu cầu trả hàng
 *     description: |
 *       Lấy danh sách tất cả yêu cầu trả hàng trong hệ thống.
 *       Hỗ trợ filter theo `status`.
 *       Dữ liệu trả về gồm thông tin request, user tạo request, và danh sách `return_items`
 *       đã join sang product, variant và ảnh variant.
 *     tags:
 *       - Admin Return Requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, received, completed]
 *     responses:
 *       200:
 *         description: Lấy danh sách yêu cầu trả hàng thành công
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
 *                         example: 10
 *                       order_id:
 *                         type: integer
 *                         example: 123
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 8
 *                           full_name:
 *                             type: string
 *                             example: "Nguyen Van A"
 *                           email:
 *                             type: string
 *                             example: "customer@example.com"
 *                           phone_number:
 *                             type: string
 *                             nullable: true
 *                             example: "0901234567"
 *                       reason:
 *                         type: string
 *                         example: "Sản phẩm bị lỗi khi nhận hàng"
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected, received, completed]
 *                         example: pending
 *                       admin_note:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       refund_amount:
 *                         type: number
 *                         format: decimal
 *                         example: 25990000
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-04-21T10:00:00.000Z"
 *                       return_items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 100
 *                             name:
 *                               type: string
 *                               example: "RTX 4070 SUPER"
 *                             slug:
 *                               type: string
 *                               example: "rtx-4070-super"
 *                             variant:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                   example: 5
 *                                 version:
 *                                   type: string
 *                                   nullable: true
 *                                   example: "12GB GDDR6X"
 *                                 color:
 *                                   type: string
 *                                   nullable: true
 *                                   example: "Black"
 *                                 color_hex:
 *                                   type: string
 *                                   nullable: true
 *                                   example: "#111111"
 *                                 image_url:
 *                                   type: string
 *                                   nullable: true
 *                                   example: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
 *                             quantity:
 *                               type: integer
 *                               example: 1
 *       400:
 *         description: Tham số không hợp lệ
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
 *                   example: "status không hợp lệ"
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
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
 *                   example: "Token không hợp lệ hoặc đã hết hạn"
 *       403:
 *         description: Không có quyền admin
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
 *                   example: "Bạn không có quyền truy cập"
 */
router.get('/', GetAdminReturnRequestsController);

/**
 * @swagger
 * /admin/return-requests/{id}:
 *   get:
 *     summary: Chi tiết yêu cầu trả hàng
 *     description: |
 *       Lấy chi tiết một yêu cầu trả hàng.
 *       Response bao gồm thông tin request, user tạo request, danh sách `return_items`,
 *       danh sách ảnh minh chứng và địa chỉ giao hàng của đơn gốc.
 *     tags:
 *       - Admin Return Requests
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
 *         description: Lấy chi tiết yêu cầu trả hàng thành công
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
 *                       example: 10
 *                     order_id:
 *                       type: integer
 *                       example: 123
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 8
 *                         full_name:
 *                           type: string
 *                           example: "Nguyen Van A"
 *                         email:
 *                           type: string
 *                           example: "customer@example.com"
 *                         phone_number:
 *                           type: string
 *                           nullable: true
 *                           example: "0901234567"
 *                     reason:
 *                       type: string
 *                       example: "Sản phẩm bị lỗi khi nhận hàng"
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected, received, completed]
 *                       example: pending
 *                     admin_note:
 *                       type: string
 *                       nullable: true
 *                       example: "Đang chờ kiểm tra"
 *                     refund_amount:
 *                       type: number
 *                       format: decimal
 *                       example: 25990000
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-04-21T10:00:00.000Z"
 *                     return_items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 100
 *                           product_id:
 *                             type: integer
 *                             example: 20
 *                           name:
 *                             type: string
 *                             example: "RTX 4070 SUPER"
 *                           slug:
 *                             type: string
 *                             example: "rtx-4070-super"
 *                           variant:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 5
 *                               version:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "12GB GDDR6X"
 *                               color:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "Black"
 *                               color_hex:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "#111111"
 *                               image_url:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
 *                           quantity:
 *                             type: integer
 *                             example: 1
 *                           condition:
 *                             type: string
 *                             enum: [good, damaged, wrong_item]
 *                             example: damaged
 *                           unit_price:
 *                             type: number
 *                             format: decimal
 *                             example: 25990000
 *                     images:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           image_url:
 *                             type: string
 *                             example: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
 *                     address:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 12
 *                         recipient:
 *                           type: string
 *                           example: "Nguyen Van A"
 *                         phone_number:
 *                           type: string
 *                           example: "0901234567"
 *                         province:
 *                           type: string
 *                           example: "Ho Chi Minh"
 *                         district:
 *                           type: string
 *                           example: "District 1"
 *                         ward:
 *                           type: string
 *                           example: "Ben Nghe"
 *                         street:
 *                           type: string
 *                           example: "123 Le Loi"
 *       400:
 *         description: ID không hợp lệ hoặc yêu cầu không tồn tại
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
 *                   example: "Yêu cầu trả hàng không tồn tại"
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
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
 *                   example: "Token không hợp lệ hoặc đã hết hạn"
 *       403:
 *         description: Không có quyền admin
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
 *                   example: "Bạn không có quyền truy cập"
 */
router.get('/:id', GetAdminReturnRequestDetailController);

/**
 * @swagger
 * /admin/return-requests/{id}/approve:
 *   patch:
 *     summary: Duyệt yêu cầu trả hàng
 *     description: |
 *       Duyệt yêu cầu trả hàng.
 *       API cập nhật `refund_amount` thực tế, `admin_note` (nếu có),
 *       và chuyển trạng thái request từ `pending` sang `approved`.
 *     tags:
 *       - Admin Return Requests
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
 *               - refund_amount
 *             properties:
 *               refund_amount:
 *                 type: number
 *                 format: decimal
 *                 description: Số tiền hoàn thực tế được admin duyệt
 *                 example: 19990000
 *               admin_note:
 *                 type: string
 *                 nullable: true
 *                 description: Ghi chú duyệt của admin
 *                 example: "Đã kiểm tra, chấp nhận hoàn tiền một phần"
 *     responses:
 *       200:
 *         description: Duyệt yêu cầu trả hàng thành công
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
 *                       example: 10
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected, received, completed]
 *                       example: approved
 *                     admin_note:
 *                       type: string
 *                       nullable: true
 *                       example: "Đã kiểm tra, chấp nhận hoàn tiền một phần"
 *                     refund_amount:
 *                       type: number
 *                       format: decimal
 *                       example: 19990000
 *                 message:
 *                   type: string
 *                   example: "Duyệt yêu cầu trả hàng thành công"
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc trạng thái không cho phép
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
 *                   example: "Chỉ có thể duyệt yêu cầu đang ở trạng thái pending"
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
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
 *       403:
 *         description: Không có quyền admin
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
 *                   example: "Bạn không có quyền truy cập"
 */
router.patch('/:id/approve', ApproveAdminReturnRequestController);

/**
 * @swagger
 * /admin/return-requests/{id}/reject:
 *   patch:
 *     summary: Từ chối yêu cầu trả hàng
 *     description: |
 *       Từ chối yêu cầu trả hàng.
 *       API yêu cầu `admin_note` là lý do từ chối, đặt `refund_amount = 0`
 *       và chuyển trạng thái request từ `pending` sang `rejected`.
 *     tags:
 *       - Admin Return Requests
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
 *               - admin_note
 *             properties:
 *               admin_note:
 *                 type: string
 *                 description: Lý do từ chối yêu cầu trả hàng
 *                 example: "Sản phẩm không thuộc điều kiện đổi trả"
 *     responses:
 *       200:
 *         description: Từ chối yêu cầu trả hàng thành công
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
 *                       example: 10
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected, received, completed]
 *                       example: rejected
 *                     admin_note:
 *                       type: string
 *                       example: "Sản phẩm không thuộc điều kiện đổi trả"
 *                     refund_amount:
 *                       type: number
 *                       format: decimal
 *                       example: 0
 *                 message:
 *                   type: string
 *                   example: "Từ chối yêu cầu trả hàng thành công"
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc trạng thái không cho phép
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
 *                   example: "admin_note là bắt buộc"
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
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
 *       403:
 *         description: Không có quyền admin
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
 *                   example: "Bạn không có quyền truy cập"
 */
router.patch('/:id/reject', RejectAdminReturnRequestController);

/**
 * @swagger
 * /admin/return-requests/{id}/received:
 *   patch:
 *     summary: Xác nhận đã nhận hàng trả về
 *     description: |
 *       Xác nhận đã nhận hàng trả về.
 *       API cộng lại tồn kho cho từng variant trong request,
 *       tạo `StockLogs` mới cho từng variant, và chuyển trạng thái request từ `approved` sang `received`.
 *     tags:
 *       - Admin Return Requests
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
 *         description: Xác nhận nhận hàng trả về thành công
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
 *                       example: 10
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected, received, completed]
 *                       example: received
 *                     admin_note:
 *                       type: string
 *                       nullable: true
 *                       example: "Đã kiểm tra, chấp nhận hoàn tiền một phần"
 *                     refund_amount:
 *                       type: number
 *                       format: decimal
 *                       example: 19990000
 *                 message:
 *                   type: string
 *                   example: "Xác nhận đã nhận hàng trả về thành công"
 *       400:
 *         description: ID không hợp lệ hoặc trạng thái không cho phép
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
 *                   example: "Chỉ có thể xác nhận đã nhận hàng khi yêu cầu ở trạng thái approved"
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
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
 *       403:
 *         description: Không có quyền admin
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
 *                   example: "Bạn không có quyền truy cập"
 */
router.patch('/:id/received', MarkAdminReturnRequestReceivedController);

/**
 * @swagger
 * /admin/return-requests/{id}/complete:
 *   patch:
 *     summary: Hoàn tất xử lý trả hàng
 *     description: |
 *       Hoàn tất xử lý trả hàng.
 *       API chuyển request từ `received` sang `completed`,
 *       cập nhật order liên quan sang `payment_status = refunded`, `order_status = failed`,
 *       set `cancel_reason`, tạo `OrderStatusLogs` mới nếu cần,
 *       và cập nhật các payment thành `refunded` nếu đang ở trạng thái `success`.
 *     tags:
 *       - Admin Return Requests
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
 *         description: Hoàn tất xử lý trả hàng thành công
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
 *                       example: 10
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected, received, completed]
 *                       example: completed
 *                     order_id:
 *                       type: integer
 *                       example: 123
 *                     order_status:
 *                       type: string
 *                       example: failed
 *                     payment_status:
 *                       type: string
 *                       example: refunded
 *                     cancel_reason:
 *                       type: string
 *                       example: "Hoàn tất trả hàng/hoàn tiền cho yêu cầu #10"
 *                 message:
 *                   type: string
 *                   example: "Hoàn tất xử lý trả hàng thành công"
 *       400:
 *         description: ID không hợp lệ hoặc trạng thái không cho phép
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
 *                   example: "Chỉ có thể hoàn tất yêu cầu khi trạng thái là received"
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
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
 *       403:
 *         description: Không có quyền admin
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
 *                   example: "Bạn không có quyền truy cập"
 */
router.patch('/:id/complete', CompleteAdminReturnRequestController);

export default router;
