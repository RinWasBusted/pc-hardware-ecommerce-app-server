import { Router } from 'express';
import { deleteProductImage, setProductImagePrimary } from '../product/product.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/product-images/{id}:
 *   delete:
 *     summary: Xóa ảnh sản phẩm
 *     tags:
 *       - Admin Products
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
 *         description: Xóa ảnh thành công
 *       400:
 *         description: Ảnh không tồn tại hoặc không thể xóa
 */
router.delete('/:id', deleteProductImage);

/**
 * @swagger
 * /admin/product-images/{id}/primary:
 *   patch:
 *     summary: Đặt ảnh làm ảnh chính
 *     tags:
 *       - Admin Products
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
 *         description: Đặt ảnh chính thành công
 *       400:
 *         description: Ảnh không tồn tại hoặc không hợp lệ
 */
router.patch('/:id/primary', setProductImagePrimary);

export default router;
