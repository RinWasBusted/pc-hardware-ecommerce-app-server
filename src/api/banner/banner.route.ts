import { Router } from 'express';
import { GetBannersController } from '../admin/banner/banner.controller.js';

const router = Router();

/**
 * @swagger
 * /banners:
 *   get:
 *     summary: Lấy danh sách banner công khai
 *     description: Public API để lấy danh sách banner. Mặc định sắp xếp theo sort_order tăng dần.
 *     tags:
 *       - Banners
 *     parameters:
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Hướng sắp xếp theo sort_order
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái active
 *     responses:
 *       200:
 *         description: Lấy danh sách banner thành công
 *       400:
 *         description: Tham số không hợp lệ
 */
router.get('/', GetBannersController);

export default router;
