import { Router } from 'express';
import { GetProductDetailController, GetProductsByCategoryController, GetProductsController } from './product.controller.js';

const router = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Danh sách sản phẩm (có phân trang + lọc)
 *     tags:
 *       - Products
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
 *           example: "laptop"
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
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           example: newest
 *     responses:
 *       200:
 *         description: Lấy danh sách sản phẩm thành công
 *       400:
 *         description: Tham số không hợp lệ hoặc lỗi khi lấy dữ liệu
 */
router.get('/', GetProductsController);

/**
 * @swagger
 * /products/by-category/{category_id}:
 *   get:
 *     summary: Sản phẩm theo danh mục (homepage block)
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: category_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 8
 *     responses:
 *       200:
 *         description: Lấy sản phẩm theo danh mục thành công
 *       400:
 *         description: ID danh mục không hợp lệ hoặc lỗi khi lấy dữ liệu
 */
router.get('/by-category/:category_id', GetProductsByCategoryController);

/**
 * @swagger
 * /products/{slug}:
 *   get:
 *     summary: Chi tiết sản phẩm theo slug
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy chi tiết sản phẩm thành công
 *       400:
 *         description: Sản phẩm không tồn tại hoặc slug không hợp lệ
 */
router.get('/:slug', GetProductDetailController);

export default router;
