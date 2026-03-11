import { Router } from 'express';
import { GetBrandDetailController, GetBrandsController } from './brand.controller.js';

const router = Router();

/**
 * @swagger
 * /brands:
 *   get:
 *     summary: Danh sách thương hiệu
 *     description: Lấy toàn bộ danh sách thương hiệu
 *     tags:
 *       - Brands
 *     responses:
 *       200:
 *         description: Lấy danh sách thương hiệu thành công
 *       400:
 *         description: Lỗi khi lấy danh sách thương hiệu
 */
router.get('/', GetBrandsController);

/**
 * @swagger
 * /brands/{id}:
 *   get:
 *     summary: Chi tiết thương hiệu
 *     description: Lấy thông tin chi tiết thương hiệu theo id
 *     tags:
 *       - Brands
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lấy chi tiết thương hiệu thành công
 *       400:
 *         description: ID không hợp lệ hoặc thương hiệu không tồn tại
 */
router.get('/:id', GetBrandDetailController);

export default router;
