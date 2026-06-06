import type { Request, Response } from 'express';
import { CreatePayOSPayment, HandlePayOSWebhook } from './payment.service.js';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

export const createPayment = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const orderId = Number(req.params.orderId);

		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(orderId) || orderId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'orderId không hợp lệ',
			});
		}

		const payment = await CreatePayOSPayment(userId, orderId);

		return res.status(201).json({
			success: true,
			data: payment,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const webhook = async (req: Request, res: Response) => {
	try {
		const result = await HandlePayOSWebhook(req.body);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message ?? 'Invalid webhook',
		});
	}
};
