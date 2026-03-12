import { Router } from 'express';
import { uploadSingle } from '../../../utils/multer.js';
import { deleteVariant, updateVariant, updateVariantImage, updateVariantStatus } from '../product/product.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/variants/{id}:
 *   put:
 *     summary: Cập nhật variant
 *     tags:
 *       - Admin Variants
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
 *             properties:
 *               sku:
 *                 type: string
 *               version:
 *                 type: string
 *               color:
 *                 type: string
 *               color_hex:
 *                 type: string
 *               price:
 *                 type: number
 *               compare_at_price:
 *                 type: number
 *                 nullable: true
 *               stock:
 *                 type: integer
 *               variant_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật biến thể thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc biến thể không tồn tại
 */
router.put('/:id', uploadSingle('variant_image'), updateVariant);

/**
 * @swagger
 * /admin/variants/{id}/image:
 *   patch:
 *     summary: Cập nhật ảnh của variant
 *     tags:
 *       - Admin Variants
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
 *               - variant_image
 *             properties:
 *               variant_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật ảnh biến thể thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc biến thể không tồn tại
 */
router.patch('/:id/image', uploadSingle('variant_image'), updateVariantImage);

/**
 * @swagger
 * /admin/variants/{id}:
 *   delete:
 *     summary: Xóa variant
 *     tags:
 *       - Admin Variants
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
 *         description: Xóa biến thể thành công
 *       400:
 *         description: Biến thể không tồn tại hoặc không thể xóa
 */
router.delete('/:id', deleteVariant);

/**
 * @swagger
 * /admin/variants/{id}/status:
 *   patch:
 *     summary: Bật/tắt variant
 *     tags:
 *       - Admin Variants
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
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái biến thể thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc biến thể không tồn tại
 */
router.patch('/:id/status', updateVariantStatus);

export default router;
