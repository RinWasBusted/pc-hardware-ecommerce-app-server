import type { Request, Response } from 'express';
import {
	CancelAdminOrder,
	GetAdminOrderDetail,
	GetAdminOrders,
	GetAdminOrderStatusLogs,
	UpdateAdminOrderStatus,
} from './order.service.js';

const ORDER_STATUSES = new Set([
	'pending',
	'confirmed',
	'preparing',
	'packed',
	'shipping',
	'delivered',
	'failed',
	'cancelled',
]);

const PAYMENT_STATUSES = new Set(['unpaid', 'paid', 'refunded']);

const STATUS_UPDATE_ALLOWED = new Set([
	'confirmed',
	'preparing',
	'packed',
	'shipping',
	'delivered',
	'failed',
	'cancelled',
]);

const parseDateStart = (value: string) => {
	const date = new Date(`${value}T00:00:00.000Z`);
	return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateEnd = (value: string) => {
	const date = new Date(`${value}T23:59:59.999Z`);
	return Number.isNaN(date.getTime()) ? null : date;
};

export const GetAdminOrdersController = async (req: Request, res: Response) => {
	try {
		const filters: {
			status?: string;
			payment_status?: string;
			user_id?: number;
			date_from?: Date;
			date_to?: Date;
			search?: string;
		} = {};

		if (typeof req.query.status === 'string') {
			if (!ORDER_STATUSES.has(req.query.status)) {
				return res.status(400).json({
					success: false,
					message: 'status không hợp lệ',
				});
			}
			filters.status = req.query.status;
		}

		if (typeof req.query.payment_status === 'string') {
			if (!PAYMENT_STATUSES.has(req.query.payment_status)) {
				return res.status(400).json({
					success: false,
					message: 'payment_status không hợp lệ',
				});
			}
			filters.payment_status = req.query.payment_status;
		}

		if (typeof req.query.user_id === 'string' && req.query.user_id.trim() !== '') {
			const userId = Number(req.query.user_id);
			if (Number.isNaN(userId) || userId <= 0) {
				return res.status(400).json({
					success: false,
					message: 'user_id không hợp lệ',
				});
			}
			filters.user_id = userId;
		}

		if (typeof req.query.date_from === 'string') {
			const parsed = parseDateStart(req.query.date_from);
			if (!parsed) {
				return res.status(400).json({
					success: false,
					message: 'date_from không hợp lệ',
				});
			}
			filters.date_from = parsed;
		}

		if (typeof req.query.date_to === 'string') {
			const parsed = parseDateEnd(req.query.date_to);
			if (!parsed) {
				return res.status(400).json({
					success: false,
					message: 'date_to không hợp lệ',
				});
			}
			filters.date_to = parsed;
		}

		if (typeof req.query.search === 'string' && req.query.search.trim() !== '') {
			filters.search = req.query.search.trim();
		}

		const orders = await GetAdminOrders(filters);

		return res.status(200).json({
			success: true,
			data: orders,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const GetAdminOrderDetailController = async (req: Request, res: Response) => {
	try {
		const orderId = Number(req.params.id);

		if (Number.isNaN(orderId) || orderId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'order_id không hợp lệ',
			});
		}

		const order = await GetAdminOrderDetail(orderId);

		return res.status(200).json({
			success: true,
			data: order,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const UpdateAdminOrderStatusController = async (req: Request, res: Response) => {
	try {
		const adminId = Number(res.locals.userId);
		const orderId = Number(req.params.id);
		const orderStatus = typeof req.body.order_status === 'string' ? req.body.order_status : '';
		const note = typeof req.body.note === 'string' ? req.body.note.trim() : undefined;

		if (Number.isNaN(adminId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(orderId) || orderId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'order_id không hợp lệ',
			});
		}

		if (!STATUS_UPDATE_ALLOWED.has(orderStatus)) {
			return res.status(400).json({
				success: false,
				message: 'order_status không hợp lệ',
			});
		}

		const updated = await UpdateAdminOrderStatus(orderId, adminId, orderStatus, note);

		return res.status(200).json({
			success: true,
			data: updated,
			message: 'Cập nhật trạng thái đơn hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const CancelAdminOrderController = async (req: Request, res: Response) => {
	try {
		const adminId = Number(res.locals.userId);
		const orderId = Number(req.params.id);
		const reason = typeof req.body.cancel_reason === 'string' ? req.body.cancel_reason.trim() : '';

		if (Number.isNaN(adminId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(orderId) || orderId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'order_id không hợp lệ',
			});
		}

		if (!reason) {
			return res.status(400).json({
				success: false,
				message: 'cancel_reason là bắt buộc',
			});
		}

		const updated = await CancelAdminOrder(orderId, adminId, reason);

		return res.status(200).json({
			success: true,
			data: updated,
			message: 'Hủy đơn hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const GetAdminOrderStatusLogsController = async (req: Request, res: Response) => {
	try {
		const orderId = Number(req.params.id);

		if (Number.isNaN(orderId) || orderId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'order_id không hợp lệ',
			});
		}

		const logs = await GetAdminOrderStatusLogs(orderId);

		return res.status(200).json({
			success: true,
			data: logs,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
