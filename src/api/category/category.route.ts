import { Router } from 'express';
import { GetCategoriesController, GetCategoryDetailController } from './category.controller.js';

const router = Router();

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Lấy toàn bộ danh mục (dạng cây)
 *     description: Trả về danh sách danh mục dạng cây (parent -> children)
 *     tags:
 *       - Categories
 *     responses:
 *       200:
 *         description: Lấy danh mục thành công
 *       400:
 *         description: Lỗi khi lấy danh mục
 */
router.get('/', GetCategoriesController);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Chi tiết danh mục
 *     description: Trả về thông tin chi tiết danh mục theo id, bao gồm cây con của danh mục đó
 *     tags:
 *       - Categories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lấy chi tiết danh mục thành công
 *       400:
 *         description: ID không hợp lệ hoặc danh mục không tồn tại
 */
router.get('/:id', GetCategoryDetailController);

export default router;
