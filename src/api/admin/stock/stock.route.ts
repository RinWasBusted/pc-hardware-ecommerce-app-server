import { Router } from 'express';
import { CreateStockInboundController, GetLowStockVariantsController, GetStockLogsController } from './stock.controller.js';

const router = Router();

/**
 * @swagger
 * /admin/stock/low-stock:
 *   get:
 *     summary: Danh sách variant sắp hết hàng
 *     tags:
 *       - Admin Stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *       400:
 *         description: Tham số không hợp lệ
 */
router.get('/low-stock', GetLowStockVariantsController);

/**
 * @swagger
 * /admin/stock/inbound:
 *   post:
 *     summary: Nhập hàng vào kho
 *     tags:
 *       - Admin Stock
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - variant_id
 *                 - change_qty
 *               properties:
 *                 variant_id:
 *                   type: integer
 *                 change_qty:
 *                   type: integer
 *                   description: Số lượng nhập (số dương)
 *                 note:
 *                   type: string
 *     responses:
 *       201:
 *         description: Nhập kho thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/inbound', CreateStockInboundController);

/**
 * @swagger
 * /admin/stock/logs:
 *   get:
 *     summary: Lịch sử nhập/xuất kho
 *     tags:
 *       - Admin Stock
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: variant_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           example: "2026-03-12"
 *     responses:
 *       200:
 *         description: Lấy lịch sử thành công
 *       400:
 *         description: Tham số không hợp lệ
 */
router.get('/logs', GetStockLogsController);

export default router;
