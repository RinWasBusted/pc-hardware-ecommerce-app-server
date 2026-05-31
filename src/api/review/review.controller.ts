import type { Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import AppError from '../../utils/appError.js';
import { createReview, editReview, getProductReviews, getUnreviewedPaidOrderItems, getVariantReviews } from './review.service.js';

export const createReviewController = async (req: AuthRequest, res: Response) => {
	const userId = Number(res.locals.userId);
	if (Number.isNaN(userId)) {
		throw new AppError('Không xác định được người dùng', 401);
	}

	const orderItemId = Number(req.body.order_item_id);
	const rating = Number(req.body.rating);
	const comment = req.body.comment ? String(req.body.comment) : undefined;
	const imageFiles = req.files as Express.Multer.File[] | undefined;

	if (Number.isNaN(orderItemId) || orderItemId <= 0) {
		throw new AppError('order_item_id không hợp lệ', 400);
	}

	if (Number.isNaN(rating)) {
		throw new AppError('rating không hợp lệ', 400);
	}

	const review = await createReview(userId, orderItemId, rating, comment, imageFiles);

	return res.status(201).json({
		success: true,
		message: 'Đánh giá sản phẩm thành công',
		data: review,
	});
};

export const editReviewController = async (req: AuthRequest, res: Response) => {
	const userId = Number(res.locals.userId);
	const reviewId = Number(req.params.review_id);

	if (Number.isNaN(userId)) {
		throw new AppError('Không xác định được người dùng', 401);
	}

	if (Number.isNaN(reviewId) || reviewId <= 0) {
		throw new AppError('review_id không hợp lệ', 400);
	}

	const rating = Number(req.body.rating);
	const comment = req.body.comment ? String(req.body.comment) : undefined;
	
	let deletedImageKeys: string[] = [];
	if (req.body.deleted_images) {
		try {
			deletedImageKeys = typeof req.body.deleted_images === 'string'
				? JSON.parse(req.body.deleted_images)
				: req.body.deleted_images;
		} catch (error) {
			throw new AppError('deleted_images không đúng định dạng JSON array', 400);
		}
	}

	if (!Array.isArray(deletedImageKeys)) {
		throw new AppError('deleted_images phải là một mảng', 400);
	}

	const imageFiles = req.files as Express.Multer.File[] | undefined;

	if (Number.isNaN(rating)) {
		throw new AppError('rating không hợp lệ', 400);
	}

	const updatedReview = await editReview(
		userId,
		reviewId,
		rating,
		comment,
		deletedImageKeys,
		imageFiles,
	);

	return res.status(200).json({
		success: true,
		message: 'Chỉnh sửa đánh giá thành công',
		data: updatedReview,
	});
};

export const getProductReviewsController = async (req: AuthRequest, res: Response) => {
	const productId = Number(req.params.product_id);
	const page = req.query.page ? Number(req.query.page) : 1;
	const limit = req.query.limit ? Number(req.query.limit) : 10;
	const variantId = req.query.variant_id ? Number(req.query.variant_id) : undefined;
	const rating = req.query.rating ? Number(req.query.rating) : undefined;

	if (Number.isNaN(productId) || productId <= 0) {
		throw new AppError('product_id không hợp lệ', 400);
	}

	if (variantId !== undefined && (Number.isNaN(variantId) || variantId <= 0)) {
		throw new AppError('variant_id không hợp lệ', 400);
	}

	if (rating !== undefined && (Number.isNaN(rating) || rating < 1 || rating > 5)) {
		throw new AppError('rating không hợp lệ', 400);
	}

	const result = await getProductReviews(productId, {
		page,
		limit,
		...(variantId ? { variantId } : {}),
		...(rating !== undefined ? { rating } : {}),
	});

	return res.status(200).json({
		success: true,
		data: result.items,
		summary: result.summary,
		pagination: result.pagination,
	});
};

export const getUnreviewedPaidOrderItemsController = async (req: AuthRequest, res: Response) => {
	const userId = Number(res.locals.userId);
	if (Number.isNaN(userId)) {
		throw new AppError('Không xác định được người dùng', 401);
	}

	const items = await getUnreviewedPaidOrderItems(userId);

	return res.status(200).json({
		success: true,
		data: items,
	});
};

export const getVariantReviewsController = async (req: AuthRequest, res: Response) => {
	const variantId = Number(req.params.variant_id);
	const page = req.query.page ? Number(req.query.page) : 1;
	const limit = req.query.limit ? Number(req.query.limit) : 10;

	if (Number.isNaN(variantId) || variantId <= 0) {
		throw new AppError('variant_id không hợp lệ', 400);
	}

	const result = await getVariantReviews(variantId, page, limit);

	return res.status(200).json({
		success: true,
		data: result.items,
		pagination: result.pagination,
	});
};
