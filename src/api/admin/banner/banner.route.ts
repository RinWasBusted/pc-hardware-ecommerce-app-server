import { Router } from 'express';
import { uploadSingle } from '../../../utils/multer.js';
import { CreateBannerController, DeleteBannerController, GetBannersController, UpdateBannerController } from './banner.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/banners:
 *   get:
 *     summary: Lấy danh sách banner
 *     description: Lấy danh sách banner cho admin. Mặc định sắp xếp theo sort_order tăng dần.
 *     tags:
 *       - Admin Banners
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /admin/banners:
 *   post:
 *     summary: Tạo banner mới
 *     description: Tạo banner mới bằng file ảnh. Banner mới sẽ được gắn sort_order = 1, các banner còn lại tự tăng sort_order lên 1.
 *     tags:
 *       - Admin Banners
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               link_url:
 *                 type: string
 *                 example: "https://example.com/promo"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Tạo banner thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc thiếu file ảnh
 */
router.post('/', uploadSingle('image'), CreateBannerController);

/**
 * @swagger
 * /admin/banners/{id}:
 *   put:
 *     summary: Cập nhật thông tin banner
 *     description: Cập nhật banner theo id. Tất cả các trường truyền vào là optional. Nếu sort_order mới bị trùng với banner khác, hai banner đó sẽ trao đổi sort_order cho nhau.
 *     tags:
 *       - Admin Banners
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
 *               image:
 *                 type: string
 *                 format: binary
 *               link_url:
 *                 type: string
 *                 example: "https://example.com/promo-edit"
 *               sort_order:
 *                 type: integer
 *                 example: 2
 *               is_active:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Cập nhật banner thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc banner không tồn tại
 */
router.put('/:id', uploadSingle('image'), UpdateBannerController);

/**
 * @swagger
 * /admin/banners/{id}:
 *   delete:
 *     summary: Xóa banner
 *     description: Xóa banner theo id. Sau khi xóa, tất cả banner có sort_order lớn hơn banner đã xóa sẽ tự giảm sort_order xuống 1.
 *     tags:
 *       - Admin Banners
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
 *         description: Xóa banner thành công
 *       400:
 *         description: ID không hợp lệ hoặc banner không tồn tại
 */
router.delete('/:id', DeleteBannerController);

export default router;
