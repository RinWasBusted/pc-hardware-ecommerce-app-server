import type { Request, Response } from 'express';
import { chatWithBot, chatWithBotStream } from './chatbot.service.js';

export const ChatController = async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Tin nhắn không được để trống' });
        }

        if (message.length > 500) {
            return res.status(400).json({ success: false, message: 'Tin nhắn quá dài' });
        }

        const safeHistory = Array.isArray(history)
            ? history
                .filter((h: any) =>
                    (h.role === 'user' || h.role === 'assistant') &&
                    typeof h.content === 'string',
                )
                .slice(-10)
            : [];

        const reply = await chatWithBot(message.trim(), safeHistory);
        return res.json({ success: true, reply });
    } catch (error: any) {
        console.error('Chatbot error:', error?.message);
        return res.status(500).json({ success: false, message: 'Chatbot tạm thời không khả dụng' });
    }
};

export const ChatStreamController = async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Tin nhắn không được để trống' });
        }

        if (message.length > 500) {
            return res.status(400).json({ success: false, message: 'Tin nhắn quá dài' });
        }

        const safeHistory = Array.isArray(history)
            ? history
                .filter((h: any) =>
                    (h.role === 'user' || h.role === 'assistant') &&
                    typeof h.content === 'string',
                )
                .slice(-10)
            : [];

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const stream = await chatWithBotStream(message.trim(), safeHistory);

        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content ?? '';
            if (token) {
                res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error: any) {
        console.error('Chatbot stream error:', error?.message);
        if (!res.headersSent) {
            return res.status(500).json({ success: false, message: 'Chatbot tạm thời không khả dụng' });
        }
        res.write(`data: ${JSON.stringify({ error: 'Lỗi kết nối' })}\n\n`);
        res.end();
    }
};