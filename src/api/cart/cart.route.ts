import { Router } from 'express';
import { Authenticate } from '../../middleware/auth.middleware.js';
import { AddCartItemController, ClearCartController, GetCartController, RemoveCartItemController, UpdateCartItemController } from './cart.controller.js';

const router = Router();

router.use(Authenticate);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Lấy giỏ hàng hiện tại (bao gồm items + tổng tiền)
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy giỏ hàng thành công
 *       401:
 *         description: Token không hợp lệ hoặc đã hết hạn
 */
router.get('/', GetCartController);

/**
 * @swagger
 * /cart/items:
 *   post:
 *     summary: Thêm sản phẩm vào giỏ
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - variant_id
 *               - quantity
 *             properties:
 *               variant_id:
 *                 type: integer
 *                 example: 1
 *               quantity:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Thêm sản phẩm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/items', AddCartItemController);

/**
 * @swagger
 * /cart/items/{variant_id}:
 *   put:
 *     summary: Cập nhật số lượng sản phẩm trong giỏ
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: variant_id
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
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Cập nhật số lượng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.put('/items/:variant_id', UpdateCartItemController);

/**
 * @swagger
 * /cart/items/{variant_id}:
 *   delete:
 *     summary: Xóa sản phẩm khỏi giỏ
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: variant_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa sản phẩm khỏi giỏ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.delete('/items/:variant_id', RemoveCartItemController);

/**
 * @swagger
 * /cart:
 *   delete:
 *     summary: Xóa toàn bộ giỏ hàng
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Xóa giỏ hàng thành công
 */
router.delete('/', ClearCartController);

export default router;
