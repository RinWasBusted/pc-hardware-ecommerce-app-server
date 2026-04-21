import { Router } from 'express';
import { Authenticate, Authorize } from '../../middleware/auth.middleware.js';
import { upload } from '../../utils/multer.js';
import {
	CreateReturnRequestController,
	GetMyReturnRequestDetailController,
	GetMyReturnRequestsController,
} from './return-request.controller.js';

const router = Router();

router.use(Authenticate, Authorize('customer'));

/**
 * @swagger
 * /return-requests:
 *   post:
 *     summary: Tạo yêu cầu trả hàng / hoàn tiền
 *     description: |
 *       Tạo yêu cầu trả hàng cho đơn hàng của chính người dùng.
 *       API hiện chỉ chấp nhận tạo yêu cầu trả hàng cho đơn hàng đã ở trạng thái `delivered`.
 *       Khi gửi `multipart/form-data`, trường `items` có thể được gửi dưới dạng JSON string.
 *     tags:
 *       - Return Requests
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - reason
 *               - items
 *             properties:
 *               order_id:
 *                 type: integer
 *                 description: ID đơn hàng cần tạo yêu cầu trả hàng
 *                 example: 123
 *               reason:
 *                 type: string
 *                 description: Lý do khách hàng yêu cầu trả hàng / hoàn tiền
 *                 example: "Sản phẩm bị lỗi khi nhận hàng"
 *               items:
 *                 description: |
 *                   Danh sách order item cần trả hàng.
 *                   Với `multipart/form-data`, nên gửi dưới dạng JSON string.
 *                 oneOf:
 *                   - type: string
 *                     example: "[{\"order_item_id\":1,\"quantity\":1,\"condition\":\"damaged\"}]"
 *                   - type: array
 *                     items:
 *                       type: object
 *                       required:
 *                         - order_item_id
 *                         - quantity
 *                         - condition
 *                       properties:
 *                         order_item_id:
 *                           type: integer
 *                           description: ID của dòng sản phẩm trong đơn hàng
 *                           example: 1
 *                         quantity:
 *                           type: integer
 *                           description: Số lượng cần trả
 *                           example: 1
 *                         condition:
 *                           type: string
 *                           description: Tình trạng sản phẩm trả về
 *                           enum: [good, damaged, wrong_item]
 *                           example: damaged
 *               images:
 *                 type: array
 *                 description: Danh sách ảnh minh chứng, tối đa 10 ảnh
 *                 items:
 *                   type: string
 *                   format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - reason
 *               - items
 *             properties:
 *               order_id:
 *                 type: integer
 *                 example: 123
 *               reason:
 *                 type: string
 *                 example: "Sản phẩm bị lỗi khi nhận hàng"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - order_item_id
 *                     - quantity
 *                     - condition
 *                   properties:
 *                     order_item_id:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 1
 *                     condition:
 *                       type: string
 *                       enum: [good, damaged, wrong_item]
 *                       example: damaged
 *     responses:
 *       201:
 *         description: Tạo yêu cầu trả hàng thành công
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
 *                       example: pending
 *                     refund_amount:
 *                       type: number
 *                       format: decimal
 *                       example: 25990000
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-04-21T08:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Tạo yêu cầu trả hàng thành công"
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc không đủ điều kiện trả hàng
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
 *                   example: "Chỉ có thể tạo yêu cầu trả hàng cho đơn hàng đã giao"
 *       401:
 *         description: Chưa đăng nhập
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
 *         description: Không có quyền truy cập
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
router.post('/', upload.array('images', 10), CreateReturnRequestController);

/**
 * @swagger
 * /return-requests:
 *   get:
 *     summary: Danh sách yêu cầu trả hàng của tôi
 *     description: |
 *       Trả về danh sách yêu cầu trả hàng của customer hiện tại.
 *       Mỗi yêu cầu bao gồm thông tin chung và danh sách `return_items` đã join sang product, variant và ảnh variant.
 *     tags:
 *       - Return Requests
 *     security:
 *       - bearerAuth: []
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
 *                         example: "2026-04-21T08:30:00.000Z"
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
 *       401:
 *         description: Chưa đăng nhập
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
 *         description: Không có quyền truy cập
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
router.get('/', GetMyReturnRequestsController);

/**
 * @swagger
 * /return-requests/{id}:
 *   get:
 *     summary: Chi tiết yêu cầu trả hàng
 *     description: |
 *       Trả về chi tiết một yêu cầu trả hàng của customer hiện tại.
 *       Response bao gồm thông tin request, danh sách `return_items`, danh sách ảnh minh chứng và địa chỉ nhận hàng của đơn gốc.
 *     tags:
 *       - Return Requests
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
 *                       example: "2026-04-21T08:30:00.000Z"
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
 *         description: Chưa đăng nhập
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
 *         description: Không có quyền truy cập
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
router.get('/:id', GetMyReturnRequestDetailController);

export default router;
