import type { Request, Response } from 'express';
import * as notificationService from './notification.service.js';

/**
 * Controller lấy danh sách các thông báo hệ thống
 */
export async function getSystemNotifications(req: Request, res: Response) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await notificationService.getSystemNotifications(page, limit);

        return res.status(200).json({
            success: true,
            data: result.notifications,
            pagination: result.pagination
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Controller tạo thông báo hệ thống và phát tới tất cả người dùng hoạt động
 */
export async function createSystemNotification(req: Request, res: Response) {
    try {
        const { title, body } = req.body;

        if (!title || typeof title !== 'string' || title.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Trường title là bắt buộc và phải là chuỗi không rỗng'
            });
        }

        if (!body || typeof body !== 'string' || body.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Trường body là bắt buộc và phải là chuỗi không rỗng'
            });
        }

        const notification = await notificationService.createSystemNotification(title.trim(), body.trim());

        return res.status(201).json({
            success: true,
            data: notification,
            message: 'Tạo thông báo hệ thống và gửi thành công tới tất cả người dùng hoạt động'
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message
        });
    }
}
