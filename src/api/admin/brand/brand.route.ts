import { Router } from 'express';
import { uploadSingle } from '../../../utils/multer.js';
import {
	CreateBrandController,
	UpdateBrandController,
	DeleteBrandController,
} from './brand.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/brands:
 *   post:
 *     summary: Tạo thương hiệu mới
 *     description: Tạo thương hiệu mới bằng file logo. Không chấp nhận logo_url dạng chuỗi. Chỉ admin.
 *     tags:
 *       - Admin Brands
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - logo
 *             properties:
 *               name:
 *                 type: string
 *                 example: "ASUS"
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Tạo thương hiệu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ, thiếu file logo hoặc tên đã tồn tại
 */
router.post('/', uploadSingle('logo'), CreateBrandController);

/**
 * @swagger
 * /admin/brands/{id}:
 *   put:
 *     summary: Cập nhật thương hiệu
 *     description: Cập nhật thương hiệu theo id. Field logo là optional, nếu gửi logo mới sẽ thay thế logo cũ. Chỉ admin.
 *     tags:
 *       - Admin Brands
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "ASUS ROG"
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật thương hiệu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ, thiếu file logo hoặc thương hiệu không tồn tại
 */
router.put('/:id', uploadSingle('logo'), UpdateBrandController);

/**
 * @swagger
 * /admin/brands/{id}:
 *   delete:
 *     summary: Xóa thương hiệu
 *     description: Xóa thương hiệu theo id. Chỉ admin.
 *     tags:
 *       - Admin Brands
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
 *         description: Xóa thương hiệu thành công
 *       400:
 *         description: ID không hợp lệ hoặc thương hiệu không tồn tại
 */
router.delete('/:id', DeleteBrandController);

export default router;
