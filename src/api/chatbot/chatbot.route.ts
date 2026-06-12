import { Router } from 'express';
import { ChatController, ChatStreamController } from './chatbot.controller.js';

const router = Router();

/**
 * @swagger
 * /chatbot/chat:
 *   post:
 *     summary: Gửi tin nhắn đến chatbot AI
 *     description: Public API không yêu cầu xác thực. Chatbot chỉ truy cập dữ liệu sản phẩm, danh mục, thương hiệu, mã giảm giá công khai — không có dữ liệu người dùng.
 *     tags:
 *       - Chatbot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Tư vấn laptop gaming tầm 20 triệu"
 *               history:
 *                 type: array
 *                 description: Lịch sử hội thoại (tối đa 10 lượt gần nhất)
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, model]
 *                     parts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           text:
 *                             type: string
 *     responses:
 *       200:
 *         description: Chatbot trả lời thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 reply:
 *                   type: string
 *                   example: "Mình gợi ý cho bạn laptop ASUS ROG..."
 *       400:
 *         description: Tin nhắn không hợp lệ hoặc quá dài
 *       500:
 *         description: Chatbot tạm thời không khả dụng
 */

router.post('/chat', ChatController);
router.post('/stream', ChatStreamController);

export default router;