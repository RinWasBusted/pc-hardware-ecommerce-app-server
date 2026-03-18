import { Router } from 'express';
import { upload, uploadSingle } from '../../../utils/multer.js';
import { createProduct, createVariantForProduct, deleteProduct, getAdminProducts, getProductVariants, updateProduct, updateProductStatus, uploadProductImages } from './product.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/products:
 *   get:
 *     summary: Danh sách sản phẩm cho admin (có phân trang + lọc)
 *     tags:
 *       - Admin Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *           example: \"laptop\"
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: brand_id
 *         schema:
 *           type: integer
 *           example: 2
 *       - in: query
 *         name: price_min
 *         schema:
 *           type: number
 *           example: 10000000
 *       - in: query
 *         name: price_max
 *         schema:
 *           type: number
 *           example: 30000000
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, out_of_stock, discontinued]
 *     responses:
 *       200:
 *         description: Lấy danh sách sản phẩm thành công
 *       400:
 *         description: Tham số không hợp lệ hoặc lỗi khi lấy dữ liệu
 */
router.get('/', getAdminProducts);

/**
 * @swagger
 * /admin/products:
 *   post:
 *     summary: Tạo sản phẩm mới
 *     description: Tạo sản phẩm mới (chưa tạo biến thể). Chỉ admin.
 *     tags:
 *       - Admin Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *               - category_id
 *               - brand_id
 *             properties:
 *               sku:
 *                 type: string
 *                 example: "PRD-001"
 *               name:
 *                 type: string
 *                 example: "Laptop Gaming XYZ"
 *               description:
 *                 type: string
 *                 nullable: true
 *               category_id:
 *                 type: integer
 *                 example: 1
 *               brand_id:
 *                 type: integer
 *                 example: 2
 *               specifications:
 *                 type: object
 *                 nullable: true
 *                 example: { "cpu": "Intel Core i7", "ram": "16GB" }
 *               status:
 *                 type: string
 *                 enum: [available, out_of_stock, discontinued]
 *                 example: "available"
 *               product_images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Up to 8 product images
 *     responses:
 *       201:
 *         description: Tạo sản phẩm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc tạo sản phẩm thất bại
 */
router.post('/', upload.any(), createProduct);

/**
 * @swagger
 * /admin/products/{id}/images:
 *   post:
 *     summary: Upload ảnh sản phẩm
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
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Tải ảnh sản phẩm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc vượt quá giới hạn ảnh
 */
router.post('/:id/images', upload.array('images', 8), uploadProductImages);

/**
 * @swagger
 * /admin/products/{id}:
 *   put:
 *     summary: Cập nhật thông tin sản phẩm (không cập nhật variant)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               category_id:
 *                 type: integer
 *               brand_id:
 *                 type: integer
 *               specifications:
 *                 type: object
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Cập nhật sản phẩm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc sản phẩm không tồn tại
 */
router.put('/:id', updateProduct);

/**
 * @swagger
 * /admin/products/{id}:
 *   delete:
 *     summary: Xóa sản phẩm
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
 *         description: Xóa sản phẩm thành công
 *       400:
 *         description: Sản phẩm không tồn tại hoặc không thể xóa
 */
router.delete('/:id', deleteProduct);

/**
 * @swagger
 * /admin/products/{id}/status:
 *   patch:
 *     summary: Thay đổi trạng thái sản phẩm
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, out_of_stock, discontinued]
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái sản phẩm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc sản phẩm không tồn tại
 */
router.patch('/:id/status', updateProductStatus);

/**
 * @swagger
 * /admin/products/{id}/variants:
 *   post:
 *     summary: Thêm variant mới cho sản phẩm
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
 *               - sku
 *               - price
 *               - stock
 *               - variant_image
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
 *               is_active:
 *                 type: boolean
 *               variant_image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Thêm biến thể thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc tạo biến thể thất bại
 */
router.post('/:id/variants', uploadSingle('variant_image'), createVariantForProduct);

/**
 * @swagger
 * /admin/products/{id}/variants:
 *   get:
 *     summary: Danh sách variants của sản phẩm
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
 *         description: Lấy danh sách biến thể thành công
 *       400:
 *         description: Sản phẩm không tồn tại hoặc lỗi dữ liệu
 */
router.get('/:id/variants', getProductVariants);
export default router;
