import { prisma } from '../../../utils/prisma.js';
import { NotificationType } from '@prisma/client';
import { createNotification } from '../../notification/notification.service.js';
import AppError from '../../../utils/appError.js';

/**
 * Lấy danh sách các thông báo hệ thống (type = 'system') kèm theo phân trang
 * @param page Trang hiện tại
 * @param limit Số lượng bản ghi trên một trang
 */
export async function getSystemNotifications(page: number = 1, limit: number = 10) {
    try {
        const whereClause = {
            type: NotificationType.system
        };

        const [notifications, total] = await Promise.all([
            prisma.notifications.findMany({
                where: whereClause,
                orderBy: {
                    created_at: 'desc',
                },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.notifications.count({
                where: whereClause,
            })
        ]);

        return {
            notifications,
            pagination: {
                total,
                page,
                limit,
                hasMore: page * limit < total,
            }
        };
    } catch (error: any) {
        throw new AppError(error.message, 500);
    }
}

/**
 * Tạo một thông báo hệ thống mới và gửi đến tất cả người dùng đang hoạt động
 * @param title Tiêu đề thông báo
 * @param body Nội dung thông báo
 */
export async function createSystemNotification(title: string, body: string) {
    try {
        // Lấy danh sách ID của tất cả người dùng hoạt động (is_active = true)
        const activeUsers = await prisma.user.findMany({
            where: {
                is_active: true,
            },
            select: {
                id: true
            }
        });

        const userIds = activeUsers.map(user => user.id);

        if (userIds.length === 0) {
            throw new AppError('Không tìm thấy người dùng nào đang hoạt động để gửi thông báo', 400);
        }

        // Gọi hàm dùng chung để tạo thông báo và phát qua SSE/FCM
        const notification = await createNotification(userIds, NotificationType.system, title, body);

        return notification;
    } catch (error: any) {
        if (error instanceof AppError) throw error;
        throw new AppError(error.message, 500);
    }
}
