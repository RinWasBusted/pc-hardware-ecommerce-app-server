import Router from 'express';
import { ListCouponsController } from '../admin/coupon/coupon.controller.js';

const router = Router();

/**
 * @swagger
 * /coupons:
 *   get:
 *     summary: Danh sách coupon đang hoạt động
 *     description: Lấy danh sách tất cả coupon đang hoạt động (is_active = true).
 *     tags:
 *       - Coupons
 *     responses:
 *       200:
 *         description: Lấy danh sách coupon thành công
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
 *                         example: 1
 *                       code:
 *                         type: string
 *                         example: "SUMMER2024"
 *                       discount_type:
 *                         type: string
 *                         enum: ["percent", "fixed"]
 *                         example: "percent"
 *                       discount_value:
 *                         type: number
 *                         format: decimal
 *                         example: 10
 *                       min_order_value:
 *                         type: number
 *                         format: decimal
 *                         nullable: true
 *                         example: 100000
 *                       max_uses:
 *                         type: integer
 *                         nullable: true
 *                         example: 50
 *                       used_count:
 *                         type: integer
 *                         example: 15
 *                       expires_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: "2024-12-31T23:59:59Z"
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-01T00:00:00Z"
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.get('/', ListCouponsController);

export default router;