import type { Request, Response } from 'express';
import { CreateMomoPayment, HandleMomoCallback } from './payment.service.js';

const parseNumber = (value: unknown) => {
	const parsed = Number(value);
	return Number.isNaN(parsed) ? null : parsed;
};

const normalizeQueryValue = (value: unknown) => {
	if (Array.isArray(value)) return value[0];
	if (value === undefined || value === null) return undefined;
	return String(value);
};

export const CreateMomoPaymentController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const orderId = parseNumber(req.body.order_id);

		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (!orderId || orderId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'order_id không hợp lệ',
			});
		}

		const result = await CreateMomoPayment(userId, orderId);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const MomoIpnController = async (req: Request, res: Response) => {
	try {
		const result = await HandleMomoCallback(req.body ?? {});

		return res.status(200).json({
			resultCode: 0,
			message: 'OK',
			data: result,
		});
	} catch (error: any) {
		return res.status(400).json({
			resultCode: 1,
			message: error.message,
		});
	}
};

export const MomoReturnController = async (req: Request, res: Response) => {
	try {
		const payload = {
			partnerCode: normalizeQueryValue(req.query.partnerCode),
			accessKey: normalizeQueryValue(req.query.accessKey),
			requestId: normalizeQueryValue(req.query.requestId),
			amount: normalizeQueryValue(req.query.amount),
			orderId: normalizeQueryValue(req.query.orderId),
			orderInfo: normalizeQueryValue(req.query.orderInfo),
			orderType: normalizeQueryValue(req.query.orderType),
			transId: normalizeQueryValue(req.query.transId),
			resultCode: normalizeQueryValue(req.query.resultCode),
			message: normalizeQueryValue(req.query.message),
			payType: normalizeQueryValue(req.query.payType),
			responseTime: normalizeQueryValue(req.query.responseTime),
			extraData: normalizeQueryValue(req.query.extraData),
			signature: normalizeQueryValue(req.query.signature),
		};

		const result = await HandleMomoCallback(payload);

		return res.status(200).json({
			success: true,
			data: result,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
