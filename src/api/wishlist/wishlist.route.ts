import { Router } from 'express';
import { Authenticate } from '../../middleware/auth.middleware.js';
import { AddToWishlistController, GetWishlistController, RemoveFromWishlistController } from './wishlist.controller.js';

const router = Router();

router.use(Authenticate);

/**
 * @swagger
 * /wishlist:
 *   get:
 *     summary: Lấy danh sách sản phẩm yêu thích
 *     tags:
 *       - Wishlist
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách yêu thích thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       added_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-01T00:00:00.000Z"
 *                       product:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 10
 *                           name:
 *                             type: string
 *                             example: "ASUS ROG STRIX"
 *                           slug:
 *                             type: string
 *                             example: "asus-rog-strix"
 *                           status:
 *                             type: string
 *                             example: "available"
 *                           category:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 2
 *                               name:
 *                                 type: string
 *                                 example: "Card đồ họa"
 *                               slug:
 *                                 type: string
 *                                 example: "card-do-hoa"
 *                           brand:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                                 example: 3
 *                               name:
 *                                 type: string
 *                                 example: "ASUS"
 *                               logo_url:
 *                                 type: string
 *                                 nullable: true
 *                                 example: "https://..."
 *                           primary_image:
 *                             type: string
 *                             nullable: true
 *                             example: "https://..."
 *                           price_min:
 *                             type: number
 *                             nullable: true
 *                             example: 1200000
 *                           price_max:
 *                             type: number
 *                             nullable: true
 *                             example: 2500000
 *       401:
 *         description: Không xác định được người dùng
 */
router.get('/', GetWishlistController);

/**
 * @swagger
 * /wishlist:
 *   post:
 *     summary: Thêm sản phẩm vào danh sách yêu thích
 *     tags:
 *       - Wishlist
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *             properties:
 *               product_id:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       201:
 *         description: Thêm sản phẩm vào danh sách yêu thích thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Thêm sản phẩm vào danh sách yêu thích thành công"
 *       400:
 *         description: product_id không hợp lệ hoặc sản phẩm đã có trong danh sách
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Sản phẩm đã có trong danh sách yêu thích"
 *       404:
 *         description: Sản phẩm không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Sản phẩm không tồn tại"
 */
router.post('/', AddToWishlistController);

/**
 * @swagger
 * /wishlist/{product_id}:
 *   delete:
 *     summary: Xóa sản phẩm khỏi danh sách yêu thích
 *     tags:
 *       - Wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 10
 *     responses:
 *       200:
 *         description: Xóa sản phẩm khỏi danh sách yêu thích thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Xóa sản phẩm khỏi danh sách yêu thích thành công"
 *       400:
 *         description: product_id không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "product_id không hợp lệ"
 *       404:
 *         description: Sản phẩm không có trong danh sách yêu thích
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Sản phẩm không có trong danh sách yêu thích"
 */
router.delete('/:product_id', RemoveFromWishlistController);

export default router;
