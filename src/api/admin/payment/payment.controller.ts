import type { Request, Response } from 'express';
import { GetPayments } from '../../payment/payment.service.js';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

export const GetAdminPaymentsController = async (req: Request, res: Response) => {
	try {
		const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
		const limitInput = parseInt(req.query.limit as string, 10) || 10;
		const limit = Math.min(Math.max(limitInput, 1), 50);

		const paymentStatus = req.query.payment_status as PaymentStatus | undefined;
		const method = req.query.method as PaymentMethod | undefined;
		const userIdQuery = req.query.user_id ? Number(req.query.user_id) : undefined;

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

		if (userIdQuery !== undefined && Number.isNaN(userIdQuery)) {
			return res.status(400).json({
				success: false,
				message: 'user_id không hợp lệ',
			});
		}

		const result = await GetPayments({
			page,
			limit,
			...(paymentStatus ? { payment_status: paymentStatus } : {}),
			...(method ? { method } : {}),
			...(userIdQuery !== undefined ? { user_id: userIdQuery } : {}),
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
