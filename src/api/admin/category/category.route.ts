import { Router } from 'express';
import {
	CreateCategoryController,
	UpdateCategoryController,
	DeleteCategoryController,
} from './category.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/categories:
 *   post:
 *     summary: Tạo danh mục mới
 *     description: Tạo danh mục mới. Chỉ admin.
 *     tags:
 *       - Admin Categories
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Mainboard"
 *               slug:
 *                 type: string
 *                 example: "mainboard"
 *               description:
 *                 type: string
 *                 example: "Danh mục bo mạch chủ"
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *                 example: null
 *     responses:
 *       201:
 *         description: Tạo danh mục thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', CreateCategoryController);

/**
 * @swagger
 * /admin/categories/{id}:
 *   put:
 *     summary: Cập nhật danh mục
 *     description: Cập nhật danh mục theo id. Chỉ admin.
 *     tags:
 *       - Admin Categories
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Mainboard Intel"
 *               slug:
 *                 type: string
 *                 example: "mainboard-intel"
 *               description:
 *                 type: string
 *                 example: "Danh mục bo mạch chủ Intel"
 *               parent_id:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *     responses:
 *       200:
 *         description: Cập nhật danh mục thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc danh mục không tồn tại
 */
router.put('/:id', UpdateCategoryController);

/**
 * @swagger
 * /admin/categories/{id}:
 *   delete:
 *     summary: Xóa danh mục
 *     description: Xóa danh mục theo id. Chỉ admin.
 *     tags:
 *       - Admin Categories
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
 *         description: Xóa danh mục thành công
 *       400:
 *         description: ID không hợp lệ hoặc danh mục không tồn tại
 */
router.delete('/:id', DeleteCategoryController);

export default router;
