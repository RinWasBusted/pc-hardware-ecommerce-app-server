import { Router } from 'express';
import { Authorize } from '../../../middleware/auth.middleware.js';
import {
	ListCouponsController,
	GetCouponController,
	CreateCouponController,
	UpdateCouponController,
	DeleteCouponController,
	ToggleCouponStatusController,
} from './coupon.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/coupons:
 *   get:
 *     summary: Danh sách coupon
 *     description: Lấy danh sách tất cả coupon, hỗ trợ lọc theo trạng thái. Chỉ admin.
 *     tags:
 *       - Admin Coupons
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_active
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái kích hoạt (true/false)
 *     responses:
 *       200:
 *         description: Lấy danh sách coupon thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.get('/', Authorize('admin'), ListCouponsController);

/**
 * @swagger
 * /admin/coupons/{id}:
 *   get:
 *     summary: Chi tiết coupon
 *     description: Lấy thông tin chi tiết một coupon theo ID. Chỉ admin.
 *     tags:
 *       - Admin Coupons
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
 *         description: Lấy coupon thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc coupon không tồn tại
 */
router.get('/:id', Authorize('admin'), GetCouponController);

/**
 * @swagger
 * /admin/coupons:
 *   post:
 *     summary: Tạo coupon mới
 *     description: Tạo một coupon mới. Chỉ admin.
 *     tags:
 *       - Admin Coupons
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discount_type
 *               - discount_value
 *             properties:
 *               code:
 *                 type: string
 *                 example: "SUMMER2024"
 *                 description: Mã coupon (unique, sẽ tự động chuyển thành uppercase)
 *               discount_type:
 *                 type: string
 *                 enum: ["percent", "fixed"]
 *                 example: "percent"
 *                 description: Loại giảm giá
 *               discount_value:
 *                 type: number
 *                 format: decimal
 *                 example: 10
 *                 description: Giá trị giảm (%, 0-100 nếu percent; hoặc số tiền nếu fixed)
 *               min_order_value:
 *                 type: number
 *                 format: decimal
 *                 nullable: true
 *                 example: 100000
 *                 description: Giá trị đơn hàng tối thiểu
 *               max_uses:
 *                 type: integer
 *                 nullable: true
 *                 example: 50
 *                 description: Số lần sử dụng tối đa
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2024-12-31T23:59:59Z"
 *                 description: Ngày hết hạn (ISO 8601)
 *               is_active:
 *                 type: boolean
 *                 nullable: true
 *                 example: true
 *                 description: Kích hoạt ngay (mặc định true)
 *     responses:
 *       201:
 *         description: Tạo coupon thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc mã coupon đã tồn tại
 */
router.post('/', Authorize('admin'), CreateCouponController);

/**
 * @swagger
 * /admin/coupons/{id}:
 *   put:
 *     summary: Cập nhật coupon
 *     description: Cập nhật thông tin coupon. Chỉ admin.
 *     tags:
 *       - Admin Coupons
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
 *             properties:
 *               code:
 *                 type: string
 *                 example: "SUMMER2024_V2"
 *               discount_type:
 *                 type: string
 *                 enum: ["percent", "fixed"]
 *               discount_value:
 *                 type: number
 *                 format: decimal
 *                 example: 15
 *               min_order_value:
 *                 type: number
 *                 format: decimal
 *                 nullable: true
 *               max_uses:
 *                 type: integer
 *                 nullable: true
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật coupon thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc coupon không tồn tại
 */
router.put('/:id', Authorize('admin'), UpdateCouponController);

/**
 * @swagger
 * /admin/coupons/{id}:
 *   delete:
 *     summary: Xóa coupon
 *     description: Xóa một coupon. Chỉ admin.
 *     tags:
 *       - Admin Coupons
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
 *         description: Xóa coupon thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc coupon không tồn tại
 */
router.delete('/:id', Authorize('admin'), DeleteCouponController);

/**
 * @swagger
 * /admin/coupons/{id}/status:
 *   patch:
 *     summary: Bật/tắt coupon
 *     description: Chuyển đổi trạng thái kích hoạt của coupon (true -> false, false -> true). Chỉ admin.
 *     tags:
 *       - Admin Coupons
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
 *         description: Chuyển đổi trạng thái coupon thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc coupon không tồn tại
 */
router.patch('/:id/status', Authorize('admin'), ToggleCouponStatusController);

export default router;
