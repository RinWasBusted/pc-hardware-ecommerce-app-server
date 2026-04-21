import type { Request, Response } from 'express';
import { deleteImagesFromCloudinary, uploadImagesToCloudinary } from '../../utils/cloudinary.js';
import {
	CreateReturnRequest,
	GetMyReturnRequestDetail,
	GetMyReturnRequests,
	type CreateReturnRequestItemInput,
	type ReturnItemCondition,
} from './return-request.service.js';

const ITEM_CONDITIONS = new Set<ReturnItemCondition>(['good', 'damaged', 'wrong_item']);

const parseReturnItems = (value: unknown) => {
	if (Array.isArray(value)) {
		return value;
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return [];

		try {
			const parsed = JSON.parse(trimmed);
			return Array.isArray(parsed) ? parsed : null;
		} catch (_error) {
			return null;
		}
	}

	return null;
};

export const CreateReturnRequestController = async (req: Request, res: Response) => {
	let uploadedPublicIds: string[] = [];

	try {
		const userId = Number(res.locals.userId);
		const orderId = Number(req.body.order_id);
		const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
		const rawItems = parseReturnItems(req.body.items);

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

		if (!reason) {
			return res.status(400).json({
				success: false,
				message: 'reason là bắt buộc',
			});
		}

		if (!rawItems || rawItems.length === 0) {
			return res.status(400).json({
				success: false,
				message: 'items không hợp lệ',
			});
		}

		const items: CreateReturnRequestItemInput[] = [];
		for (const rawItem of rawItems) {
			const orderItemId = Number((rawItem as any)?.order_item_id);
			const quantity = Number((rawItem as any)?.quantity);
			const condition = typeof (rawItem as any)?.condition === 'string'
				? (rawItem as any).condition.trim()
				: '';

			if (Number.isNaN(orderItemId) || orderItemId <= 0) {
				return res.status(400).json({
					success: false,
					message: 'order_item_id không hợp lệ',
				});
			}

			if (Number.isNaN(quantity) || quantity <= 0) {
				return res.status(400).json({
					success: false,
					message: 'quantity không hợp lệ',
				});
			}

			if (!ITEM_CONDITIONS.has(condition as ReturnItemCondition)) {
				return res.status(400).json({
					success: false,
					message: 'condition không hợp lệ',
				});
			}

			items.push({
				order_item_id: orderItemId,
				quantity,
				condition: condition as ReturnItemCondition,
			});
		}

		const imageFiles = Array.isArray(req.files) ? req.files : [];
		if (imageFiles.length > 0) {
			const uploadedImages = await uploadImagesToCloudinary(
				imageFiles,
				'pc-hardware-ecommerce/return-requests',
			);
			uploadedPublicIds = uploadedImages.map((image) => image.public_id);
		}

		const createdRequest = await CreateReturnRequest({
			user_id: userId,
			order_id: orderId,
			reason,
			items,
			image_public_ids: uploadedPublicIds,
		});

		return res.status(201).json({
			success: true,
			data: createdRequest,
			message: 'Tạo yêu cầu trả hàng thành công',
		});
	} catch (error: any) {
		if (uploadedPublicIds.length > 0) {
			await deleteImagesFromCloudinary(uploadedPublicIds).catch(() => undefined);
		}

		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const GetMyReturnRequestsController = async (_req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		const requests = await GetMyReturnRequests(userId);

		return res.status(200).json({
			success: true,
			data: requests,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const GetMyReturnRequestDetailController = async (req: Request, res: Response) => {
	try {
		const userId = Number(res.locals.userId);
		const requestId = Number(req.params.id);

		if (Number.isNaN(userId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(requestId) || requestId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'return_request_id không hợp lệ',
			});
		}

		const request = await GetMyReturnRequestDetail(userId, requestId);

		return res.status(200).json({
			success: true,
			data: request,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
