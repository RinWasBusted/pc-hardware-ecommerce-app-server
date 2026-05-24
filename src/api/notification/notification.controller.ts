import AppError from '../../utils/appError.js';
import type { Request, Response } from 'express';
import * as notificationService from './notification.service.js';
import type { NotificationType } from '@prisma/client';
import { notificationEventListener, stopListening, markUserAsOnline, markUserAsOffline, refreshUserOnlineStatus } from '../../utils/notification.js';

export async function registerToken (req: Request, res: Response) {
    const { token, device_type } = req.body;
    const userId = res.locals.userId;

    if(!token) {
        throw new AppError('Token is required', 400);
    }

    if(!device_type) {
        throw new AppError('Device type is required', 400);
    }

    await notificationService.registerToken(userId, token, device_type);

    return res.status(200).json({
        success: true,
        message: 'Token registered successfully'
    });
}

export async function getNotifications (req: Request, res: Response) {
    const userId = res.locals.userId;
    const { page, limit, type } = req.query;

    const {notifications, pagination} = await notificationService.getNotifications(userId, parseInt(page as string), parseInt(limit as string), type as NotificationType);

    return res.status(200).json({
        success: true,
        data: {
            notifications
        },
        pagination
    });
}

export async function markAsRead (req: Request, res: Response) {
    const userId = res.locals.userId;
    const { notificationIds } = req.body;

    if(!notificationIds) {
        return res.status(200).json({
            success: true,
            message: 'No notifications to mark as read'
        });
    }

    if(!Array.isArray(notificationIds)) {   
        throw new AppError('Notification IDs must be an array', 400);
    }

    await notificationService.markAsRead(userId, notificationIds);

    return res.status(200).json({
        success: true,
        message: 'Notifications marked as read successfully'
    });
}

export async function streamNotifications (req: Request, res: Response) {
    const userId = res.locals.userId;
    try {
    // Set headers for SSE - use setHeader to preserve CORS headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    res.write("\n"); // Send initial data to establish the connection
    await markUserAsOnline(userId);
    const onNotification = (data: string) => {
        console.log(`The api is sending notification to user ${userId}: ${data}`);
      res.write(`data: ${data}\n\n`);
    };

    await notificationEventListener(userId, onNotification);

    const refreshIntervalId = setInterval(async () => {
      await refreshUserOnlineStatus(userId); // Refresh online status on new connection
    }, 1000 * 45); // Refresh every 45 seconds to ensure the user stays marked as online

    // Uncomment the following block for testing SSE with dummy data.
    let cnt = 1;
    const intervalId = setInterval(() => {
        console.log(`About to send notification ${cnt} to user ${userId}`);
      notificationService.sendNotification([userId], {
        id: cnt,
        title: `Notification ${cnt}`,
        body: `This is notification number ${cnt}`,
        type: "order",
        metadata: {
          orderId: 123,
          status: "shipped"
        },
        created_at: new Date().toISOString(),
      });
      cnt++;
    }, 2000);

    req.on("close", async () => {
      clearInterval(intervalId);
      clearInterval(refreshIntervalId);
      await markUserAsOffline(userId);
      await stopListening(userId, onNotification);
      res.end();
    });
  } catch (error) {
    throw new AppError('Error streaming notifications', 500);
  }
}

export async function getUnreadCount (req: Request, res: Response) {
    const userId = res.locals.userId;
    const result = await notificationService.getUnreadCount(userId);
    return res.status(200).json({
        success: true,
        ...result
    });
}

export async function markAllAsRead (req: Request, res: Response) {
    const userId = res.locals.userId;
    await notificationService.markAllAsRead(userId);
    return res.status(200).json({
        success: true,
        message: 'All notifications marked as read successfully'
    });
}