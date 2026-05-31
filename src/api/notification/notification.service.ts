import prisma, { Prisma } from "../../utils/prisma.js";
import AppError from "../../utils/appError.js";
import { NotificationType, DevicePlatform } from "@prisma/client";
import { isUserOnline, sendOnlineUserNotification } from "../../utils/notification.js";
import { firebaseMessaging } from "../../utils/firebase.js";

export interface NotificationPayload {
    id: number;
    title: string;
    body: string;
    type: string;
    metadata?: object | null;
    created_at: string; // ISO 8601
}

export async function registerToken (userId: number, token: string, device_type: string) {
    const validPlatforms = Object.values(DevicePlatform);
    if (!validPlatforms.includes(device_type as DevicePlatform)) {
        throw new AppError(`Device type must be one of: ${validPlatforms.join(', ')}`, 400);
    }
    try {
        await prisma.userFcmTokens.upsert({
            where: { token },
            update: {
                user_id: userId,
                device_type: device_type as DevicePlatform,
            },
            create: {
                user_id: userId,
                token,
                device_type: device_type as DevicePlatform,
            }
        });
        return {
            message: 'Token registered successfully'
        };
    } catch (error: any) {
        throw new AppError(error.message, 500);
    }
}

export async function getNotifications (userId: number, page: number, limit: number, type?: NotificationType) {
    page = page ? page : 1;
    limit = limit ? limit : 10;

    if (type !== undefined) {
        const validateTypes = Object.values(NotificationType);
        if (!validateTypes.includes(type as NotificationType)) {
            throw new AppError('Invalid notification type', 400);
        }
    }

    try {
        const whereClause = {
            user_notifications: {
                some: {
                    user_id: userId,
                }
            },
            ...(type ? { type } : {})
        };

        const [notifications, total] = await Promise.all([
            prisma.notifications.findMany({
                where: whereClause,
                include: {
                    user_notifications: {
                        where: { user_id: userId },
                        select: { is_read: true, read_at: true }
                    }
                },
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

export async function markAsRead (userId: number, notificationIds: number[]) {
    try {
        await prisma.userNotifications.updateMany({
            where: {
                user_id: userId,
                notification_id: {
                    in: notificationIds,
                }
            },
            data: {
                is_read: true,
                read_at: new Date(),
            }
        });
        return {
            message: 'Notifications marked as read successfully'
        };
    } catch (error: any) {
        throw new AppError(error.message, 500);
    }
}   

export async function getUnreadCount (userId: number) {
    try {
        const count = await prisma.userNotifications.count({
            where: {
                user_id: userId,
                is_read: false,
            }
        });
        return { count };
    } catch (error: any) {
        throw new AppError(error.message, 500);
    }
}

export async function markAllAsRead (userId: number) {
    try {
        await prisma.userNotifications.updateMany({
            where: {
                user_id: userId,
                is_read: false,
            },
            data: {
                is_read: true,
                read_at: new Date(),
            }
        });
        return {
            message: 'All notifications marked as read successfully'
        };
    } catch (error: any) {
        throw new AppError(error.message, 500);
    }
}

export async function createNotification (userIds: number[], type: NotificationType, title: string, body: string, metadata?: object | null) {
    try {
        if(!userIds || userIds.length === 0) {
            userIds = await prisma.user.findMany({
                where: {
                    is_active: true,
                    role: 'customer',
                },
                select: {
                    id: true,
                }
            }).then(users => users.map(user => user.id));
        }
        const notification = await prisma.notifications.create({
            data: {
                type,
                title,
                body,
                metadata: metadata ? (metadata as Prisma.NullableJsonNullValueInput) : Prisma.DbNull,
                user_notifications: {
                    create: userIds.map((userId) => ({
                        user_id: userId,
                    }))
                }
            }
        });
        await sendNotification(userIds, {
            id: notification.id,
            title,
            body,
            type,
            metadata: metadata ?? null,
            created_at: notification.created_at.toISOString(),
        });

        
        return notification;
    } catch (error: any) {
        throw new AppError(error.message, 500);
    }
}

export async function sendNotification(user_ids: number[], data: NotificationPayload) {
    const stringData = JSON.stringify(data);
    const offlineUserIds: number[] = [];
    for (const user_id of user_ids) {
        const isOnline = await isUserOnline(user_id);
        if (!isOnline) {
            offlineUserIds.push(user_id);
        } else {
            await sendOnlineUserNotification(user_id, stringData);
        }   
    }

    if(offlineUserIds.length > 0) {
        const tokens = await prisma.userFcmTokens.findMany({
            where: {
                user_id: {
                    in: offlineUserIds,
                }
            },
            select: {
                token: true,
            }
        }).then(results => results.map(r => r.token));

        if(tokens.length > 0) {
            const response = await firebaseMessaging.sendEachForMulticast({
                tokens,
                data: {
                    notification: stringData
                }
            });

            if(response.failureCount > 0) {
                const failedTokens: string[] = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success && resp.error) {
                        const code = resp.error.code;
                        if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
                            failedTokens.push(tokens[idx] || '');
                        }
                    }
                });
                if(failedTokens.length > 0) {
                    await prisma.userFcmTokens.deleteMany({
                        where: {
                            token: {
                                in: failedTokens,
                            }
                        }
                    });
                }   
            }
        }
    }
}

export async function deleteFcmToken (userId: number, token: string) {
    await prisma.userFcmTokens.deleteMany({
        where: {
            user_id: userId,
            token
        }
    });
}