import type { Request, Response } from 'express';
import { AddCartItem, ClearCart, GetCart, RemoveCartItem, UpdateCartItem } from './cart.service.js';

export const GetCartController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		const items = await GetCart(userId);

		return res.status(200).json({
			success: true,
			data: items,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const AddCartItemController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const variantId = Number(req.body.variant_id);
		const quantity = Number(req.body.quantity);

		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(variantId) || variantId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'variant_id không hợp lệ',
			});
		}

		if (Number.isNaN(quantity) || quantity < 1) {
			return res.status(400).json({
				success: false,
				message: 'quantity không hợp lệ',
			});
		}

		await AddCartItem(userId, variantId, quantity);

		return res.status(201).json({
			success: true,
			message: 'Thêm sản phẩm vào giỏ hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const UpdateCartItemController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const variantId = Number(req.params.variant_id);
		const quantity = Number(req.body.quantity);

		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(variantId) || variantId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'variant_id không hợp lệ',
			});
		}

		if (Number.isNaN(quantity) || quantity < 1) {
			return res.status(400).json({
				success: false,
				message: 'quantity không hợp lệ',
			});
		}

		await UpdateCartItem(userId, variantId, quantity);

		return res.status(200).json({
			success: true,
			message: 'Cập nhật số lượng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const RemoveCartItemController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const variantId = Number(req.params.variant_id);

		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(variantId) || variantId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'variant_id không hợp lệ',
			});
		}

		const cart = await RemoveCartItem(userId, variantId);

		return res.status(200).json({
			success: true,
			data: cart,
			message: 'Xóa sản phẩm khỏi giỏ hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const ClearCartController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);

		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		const cart = await ClearCart(userId);

		return res.status(200).json({
			success: true,
			data: cart,
			message: 'Xóa toàn bộ giỏ hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
