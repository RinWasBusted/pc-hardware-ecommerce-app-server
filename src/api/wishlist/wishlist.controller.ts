import type { Request, Response } from 'express';
import AppError from '../../utils/appError.js';
import { AddToWishlist, GetWishlist, RemoveFromWishlist } from './wishlist.service.js';

export const GetWishlistController = async (req: Request, res: Response) => {
	const userId = Number(res.locals.userId);
	if (Number.isNaN(userId)) {
		throw new AppError('Không xác định được người dùng', 401);
	}

	const items = await GetWishlist(userId);

	return res.status(200).json({
		success: true,
		data: items,
	});
};

export const AddToWishlistController = async (req: Request, res: Response) => {
	const userId = Number(res.locals.userId);
	const productId = Number(req.body.product_id);

	if (Number.isNaN(userId)) {
		throw new AppError('Không xác định được người dùng', 401);
	}

	if (Number.isNaN(productId) || productId <= 0) {
		throw new AppError('product_id không hợp lệ', 400);
	}

	await AddToWishlist(userId, productId);

	return res.status(201).json({
		success: true,
		message: 'Thêm sản phẩm vào danh sách yêu thích thành công',
	});
};

export const RemoveFromWishlistController = async (req: Request, res: Response) => {
	const userId = Number(res.locals.userId);
	const productId = Number(req.params.product_id);

	if (Number.isNaN(userId)) {
		throw new AppError('Không xác định được người dùng', 401);
	}

	if (Number.isNaN(productId) || productId <= 0) {
		throw new AppError('product_id không hợp lệ', 400);
	}

	await RemoveFromWishlist(userId, productId);

	return res.status(200).json({
		success: true,
		message: 'Xóa sản phẩm khỏi danh sách yêu thích thành công',
	});
};
