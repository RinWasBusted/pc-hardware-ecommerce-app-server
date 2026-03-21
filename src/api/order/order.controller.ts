import type { Request, Response } from 'express';
import { CancelOrder, ConfirmOrderReceived, CreateOrder, GetMyOrders, GetOrderDetail, type OrderItemInput } from './order.service.js';

const PAYMENT_METHODS = new Set(['cod', 'momo', 'bank_transfer']);
const ORDER_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'packed', 'shipping', 'delivered', 'failed', 'cancelled']);
const PAYMENT_STATUSES = new Set(['unpaid', 'paid', 'refunded']);

export const CreateOrderController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const addressId = Number(req.body.address_id);
		const paymentMethod = typeof req.body.payment_method === 'string' ? req.body.payment_method : '';
		const note = typeof req.body.note === 'string' ? req.body.note.trim() : undefined;

		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(addressId) || addressId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'address_id không hợp lệ',
			});
		}

		if (!PAYMENT_METHODS.has(paymentMethod)) {
			return res.status(400).json({
				success: false,
				message: 'payment_method không hợp lệ',
			});
		}

		const couponRaw = req.body.coupon_id;
		let couponId: number | undefined;
		if (couponRaw !== undefined && couponRaw !== null && couponRaw !== '') {
			const parsed = Number(couponRaw);
			if (Number.isNaN(parsed) || parsed <= 0) {
				return res.status(400).json({
					success: false,
					message: 'coupon_id không hợp lệ',
				});
			}
			couponId = parsed;
		}

		if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'items không hợp lệ',
			});
		}

		const items: OrderItemInput[] = [];
		for (const raw of req.body.items) {
			const variantId = Number(raw?.variant_id);
			const quantity = Number(raw?.quantity);

			if (Number.isNaN(variantId) || variantId <= 0) {
				return res.status(400).json({
					success: false,
					message: 'variant_id không hợp lệ',
				});
			}

			if (Number.isNaN(quantity) || quantity <= 0) {
				return res.status(400).json({
					success: false,
					message: 'quantity không hợp lệ',
				});
			}

			items.push({ variant_id: variantId, quantity });
		}

		await CreateOrder({
			user_id: userId,
			address_id: addressId,
			...(couponId !== undefined ? { coupon_id: couponId } : {}),
			payment_method: paymentMethod as 'cod' | 'momo' | 'bank_transfer',
			...(note ? { note } : {}),
			items,
		});

		return res.status(201).json({
			success: true,
			message: 'Tạo đơn hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const GetOrdersController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		const orderStatus = typeof req.query.order_status === 'string' ? req.query.order_status : undefined;
		const paymentStatus = typeof req.query.payment_status === 'string' ? req.query.payment_status : undefined;

		if (orderStatus && !ORDER_STATUSES.has(orderStatus)) {
			return res.status(400).json({
				success: false,
				message: 'order_status không hợp lệ',
			});
		}

		if (paymentStatus && !PAYMENT_STATUSES.has(paymentStatus)) {
			return res.status(400).json({
				success: false,
				message: 'payment_status không hợp lệ',
			});
		}

		const orders = await GetMyOrders(userId, {
			...(orderStatus ? { order_status: orderStatus } : {}),
			...(paymentStatus ? { payment_status: paymentStatus } : {}),
		});

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

export const GetOrderDetailController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const orderId = Number(req.params.id);

		if (Number.isNaN(userId)) {
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

		const order = await GetOrderDetail(userId, orderId);

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

export const CancelOrderController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const orderId = Number(req.params.id);
		const cancelReason = typeof req.body.cancel_reason === 'string' ? req.body.cancel_reason.trim() : '';

		if (Number.isNaN(userId)) {
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

		if (!cancelReason) {
			return res.status(400).json({
				success: false,
				message: 'cancel_reason là bắt buộc',
			});
		}

		await CancelOrder(userId, orderId, cancelReason);

		return res.status(200).json({
			success: true,
			message: 'Hủy đơn hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const ConfirmReceivedController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const orderId = Number(req.params.id);

		if (Number.isNaN(userId)) {
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

		await ConfirmOrderReceived(userId, orderId);

		return res.status(200).json({
			success: true,
			message: 'Xác nhận đã nhận hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
