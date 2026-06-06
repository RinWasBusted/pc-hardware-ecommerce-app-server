import type { Request, Response } from 'express';
import { CreatePayOSPayment, HandlePayOSWebhook, GetPayments } from './payment.service.js';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

export const getPayments = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
		const limitInput = parseInt(req.query.limit as string, 10) || 10;
		const limit = Math.min(Math.max(limitInput, 1), 50);

		const paymentStatus = req.query.payment_status as PaymentStatus | undefined;
		const method = req.query.method as PaymentMethod | undefined;

		if (paymentStatus && !Object.values(PaymentStatus).includes(paymentStatus)) {
			return res.status(400).json({
				success: false,
				message: 'payment_status không hợp lệ',
			});
		}

		if (method && !Object.values(PaymentMethod).includes(method)) {
			return res.status(400).json({
				success: false,
				message: 'method không hợp lệ',
			});
		}

		const result = await GetPayments(userId, {
			page,
			limit,
			...(paymentStatus ? { payment_status: paymentStatus } : {}),
			...(method ? { method } : {}),
		});

		return res.status(200).json({
			success: true,
			data: result.items,
			pagination: result.pagination,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

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
