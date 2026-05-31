import { Router } from 'express';
import { Authenticate, Authorize } from '../../middleware/auth.middleware.js';
import { upload } from '../../utils/multer.js';
import {
	createReviewController,
	editReviewController,
	getProductReviewsController,
	getUnreviewedPaidOrderItemsController,
	getVariantReviewsController,
} from './review.controller.js';

const router = Router();

/**
 * @swagger
 * /review:
 *   post:
 *     summary: Tạo đánh giá sản phẩm
 *     description: |
 *       Tạo đánh giá cho một sản phẩm trong đơn hàng đã thanh toán.
 *       Chỉ được đánh giá trong vòng 30 ngày kể từ ngày thanh toán.
 *     tags:
 *       - Review
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - order_item_id
 *               - rating
 *             properties:
 *               order_item_id:
 *                 type: integer
 *                 example: 123
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Sản phẩm rất tốt"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_item_id
 *               - rating
 *             properties:
 *               order_item_id:
 *                 type: integer
 *                 example: 123
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo đánh giá thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 */
router.post('/', Authenticate, upload.array('images', 10), createReviewController);

/**
 * @swagger
 * /review/{review_id}:
 *   put:
 *     summary: Chỉnh sửa đánh giá sản phẩm
 *     description: |
 *       Chỉnh sửa đánh giá cho một sản phẩm.
 *       Chỉ được chỉnh sửa trong vòng 30 ngày kể từ ngày thanh toán.
 *       Khi gửi `multipart/form-data`, trường `deleted_images` có thể được gửi dưới dạng JSON string.
 *     tags:
 *       - Review
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: review_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Sản phẩm rất tốt"
 *               deleted_images:
 *                 type: string
 *                 description: JSON array của các image_url cần xóa
 *                 example: '["reviews/123_image1.jpg", "reviews/123_image2.jpg"]'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *               deleted_images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Chỉnh sửa đánh giá thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Bạn không có quyền chỉnh sửa đánh giá này
 *       404:
 *         description: Đánh giá không tồn tại
 */
router.put('/:review_id', Authenticate, upload.array('images', 10), editReviewController);

/**
 * @swagger
 * /review/unreviewed:
 *   get:
 *     summary: Lấy danh sách sản phẩm chưa được đánh giá
 *     description: |
 *       Lấy danh sách order item đã thanh toán nhưng chưa có đánh giá.
 *       Trả về ảnh, tên sản phẩm và số ngày còn lại để đánh giá.
 *     tags:
 *       - Review
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 */
router.get('/unreviewed', Authenticate, getUnreviewedPaidOrderItemsController);

/**
 * @swagger
 * /review/products/{product_id}:
 *   get:
 *     summary: Lấy danh sách đánh giá theo sản phẩm với bộ lọc
 *     description: |
 *       Lấy danh sách đánh giá của một sản phẩm với hỗ trợ lọc theo biến thể và điểm sao.
 *       API luôn trả về tổng số đánh giá và điểm đánh giá trung bình (avg_rating) của sản phẩm.
 *     tags:
 *       - Review
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: variant_id
 *         schema:
 *           type: integer
 *           description: Lọc theo biến thể (tùy chọn)
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Lọc theo điểm sao (tùy chọn)
 *     responses:
 *       200:
 *         description: Lấy đánh giá thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       rating:
 *                         type: integer
 *                       comment:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_reviews:
 *                       type: integer
 *                       description: Tổng số đánh giá của sản phẩm
 *                     avg_rating:
 *                       type: number
 *                       description: Điểm đánh giá trung bình
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 */
router.get('/products/:product_id', getProductReviewsController);

/**
 * @swagger
 * /review/variants/{variant_id}:
 *   get:
 *     summary: Lấy đánh giá theo biến thể
 *     tags:
 *       - Review
 *     parameters:
 *       - in: path
 *         name: variant_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lấy đánh giá thành công
 */
router.get('/variants/:variant_id', getVariantReviewsController);

export default router;
