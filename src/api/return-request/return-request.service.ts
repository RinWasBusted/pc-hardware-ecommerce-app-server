import prisma from '../../utils/prisma.js';
import { deleteFromStorage, getStorageUrl, uploadToStorage } from '../../utils/storage.js';

export type ReturnItemCondition = 'good' | 'damaged' | 'wrong_item';

export type CreateReturnRequestItemInput = {
	order_item_id: number;
	quantity: number;
	condition: ReturnItemCondition;
};

type VariantSummary = {
	id: number;
	version: string | null;
	color: string | null;
	color_hex: string | null;
	product_images: Array<{ image_url: string }>;
	product: {
		id: number;
		name: string;
		slug: string;
		product_images: Array<{ image_url: string }>;
	};
};

const getVariantImageUrl = (variant: VariantSummary) => {
	const imageKey = variant.product_images[0]?.image_url
		?? variant.product.product_images[0]?.image_url
		?? null;

	return imageKey ? getStorageUrl(imageKey) : null;
};

const mapVariantSummary = async (variant: VariantSummary) => ({
	id: variant.id,
	version: variant.version,
	color: variant.color,
	color_hex: variant.color_hex,
	image_url: await getVariantImageUrl(variant),
});

export const CreateReturnRequest = async (data: {
	user_id: number;
	order_id: number;
	reason: string;
	items: CreateReturnRequestItemInput[];
	image_files: Express.Multer.File[];
}) => {
	if (data.items.length === 0) {
		throw new Error('items không hợp lệ');
	}

	const uploadedImageKeys: string[] = [];

	try {
		for (const imageFile of data.image_files) {
			const imageKey = await uploadToStorage(imageFile, 'return-requests');
			uploadedImageKeys.push(imageKey);
		}

		return await prisma.$transaction(async (tx) => {
			const order = await tx.orders.findFirst({
				where: {
					id: data.order_id,
					user_id: data.user_id,
				},
				select: {
					id: true,
					order_status: true,
				},
			});

			if (!order) {
				throw new Error('Đơn hàng không tồn tại');
			}

			if (order.order_status !== 'delivered') {
				throw new Error('Chỉ có thể tạo yêu cầu trả hàng cho đơn hàng đã giao');
			}

			const orderItemIds = data.items.map((item) => item.order_item_id);
			const uniqueIds = new Set<number>();

			for (const orderItemId of orderItemIds) {
				if (uniqueIds.has(orderItemId)) {
					throw new Error('Không được gửi trùng order_item_id trong cùng một yêu cầu');
				}
				uniqueIds.add(orderItemId);
			}

			const orderItems = await tx.orderItems.findMany({
				where: {
					id: { in: orderItemIds },
					order_id: data.order_id,
				},
				select: {
					id: true,
					quantity: true,
					unit_price: true,
				},
			});

			if (orderItems.length !== orderItemIds.length) {
				throw new Error('Có sản phẩm không thuộc đơn hàng này');
			}

			const existingReturnItems = await tx.returnItems.findMany({
				where: {
					order_item_id: { in: orderItemIds },
					return_request: {
						is: {
							order_id: data.order_id,
						},
					},
				},
				select: {
					order_item_id: true,
					quantity: true,
					return_request: {
						select: {
							status: true,
						},
					},
				},
			});

			const requestedQuantityMap = new Map<number, number>();
			for (const existingItem of existingReturnItems) {
				if (existingItem.return_request.status === 'rejected') {
					continue;
				}

				const current = requestedQuantityMap.get(existingItem.order_item_id) ?? 0;
				requestedQuantityMap.set(existingItem.order_item_id, current + existingItem.quantity);
			}

			const orderItemMap = new Map(orderItems.map((item) => [item.id, item]));
			let refundAmount = 0;

			for (const item of data.items) {
				const orderItem = orderItemMap.get(item.order_item_id);
				if (!orderItem) {
					throw new Error('Có sản phẩm không thuộc đơn hàng này');
				}

				const alreadyRequested = requestedQuantityMap.get(item.order_item_id) ?? 0;
				if (alreadyRequested + item.quantity > orderItem.quantity) {
					throw new Error('Số lượng trả vượt quá số lượng đã mua');
				}

				const unitPrice = Number(orderItem.unit_price);
				if (Number.isNaN(unitPrice)) {
					throw new Error('Giá sản phẩm không hợp lệ');
				}

				refundAmount += unitPrice * item.quantity;
			}

			const returnRequest = await tx.returnRequests.create({
				data: {
					order_id: data.order_id,
					user_id: data.user_id,
					reason: data.reason,
					refund_amount: refundAmount,
				},
				select: {
					id: true,
					status: true,
					refund_amount: true,
					created_at: true,
				},
			});

			await tx.returnItems.createMany({
				data: data.items.map((item) => ({
					return_request_id: returnRequest.id,
					order_item_id: item.order_item_id,
					quantity: item.quantity,
					condition: item.condition,
				})),
			});

			if (uploadedImageKeys.length > 0) {
				await tx.returnImages.createMany({
					data: uploadedImageKeys.map((imageKey) => ({
						return_request_id: returnRequest.id,
						image_url: imageKey,
					})),
				});
			}

			return {
				id: returnRequest.id,
				status: returnRequest.status,
				refund_amount: Number(returnRequest.refund_amount),
				created_at: returnRequest.created_at,
			};
		});
	} catch (error) {
		if (uploadedImageKeys.length > 0) {
			await Promise.all(
				uploadedImageKeys.map((imageKey) => deleteFromStorage(imageKey).catch(() => undefined)),
			);
		}

		throw error;
	}
};

export const GetMyReturnRequests = async (userId: number) => {
	const requests = await prisma.returnRequests.findMany({
		where: { user_id: userId },
		orderBy: { created_at: 'desc' },
		select: {
			id: true,
			reason: true,
			status: true,
			admin_note: true,
			refund_amount: true,
			created_at: true,
			return_items: {
				orderBy: { id: 'asc' },
				select: {
					id: true,
					quantity: true,
					order_item: {
						select: {
							product_variant: {
								select: {
									id: true,
									version: true,
									color: true,
									color_hex: true,
									product_images: {
										orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
										take: 1,
										select: { image_url: true },
									},
									product: {
										select: {
											id: true,
											name: true,
											slug: true,
											product_images: {
												orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
												take: 1,
												select: { image_url: true },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	return Promise.all(requests.map(async (request) => ({
		id: request.id,
		reason: request.reason,
		status: request.status,
		admin_note: request.admin_note,
		refund_amount: Number(request.refund_amount),
		created_at: request.created_at,
		return_items: await Promise.all(request.return_items.map(async (item) => ({
			id: item.id,
			name: item.order_item.product_variant.product.name,
			slug: item.order_item.product_variant.product.slug,
			variant: await mapVariantSummary(item.order_item.product_variant),
			quantity: item.quantity,
		}))),
	})));
};

export const GetMyReturnRequestDetail = async (userId: number, requestId: number) => {
	const request = await prisma.returnRequests.findFirst({
		where: {
			id: requestId,
			user_id: userId,
		},
		select: {
			id: true,
			reason: true,
			status: true,
			admin_note: true,
			refund_amount: true,
			created_at: true,
			order: {
				select: {
					address: {
						select: {
							id: true,
							recipient: true,
							phone_number: true,
							province: true,
							district: true,
							ward: true,
							street: true,
						},
					},
				},
			},
			return_images: {
				orderBy: { id: 'asc' },
				select: {
					id: true,
					image_url: true,
				},
			},
			return_items: {
				orderBy: { id: 'asc' },
				select: {
					id: true,
					quantity: true,
					condition: true,
					order_item: {
						select: {
							unit_price: true,
							product_variant: {
								select: {
									id: true,
									version: true,
									color: true,
									color_hex: true,
									product_images: {
										orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
										take: 1,
										select: { image_url: true },
									},
									product: {
										select: {
											id: true,
											name: true,
											slug: true,
											product_images: {
												orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
												take: 1,
												select: { image_url: true },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	if (!request) {
		throw new Error('Yêu cầu trả hàng không tồn tại');
	}

	return {
		id: request.id,
		reason: request.reason,
		status: request.status,
		admin_note: request.admin_note,
		refund_amount: Number(request.refund_amount),
		created_at: request.created_at,
		return_items: await Promise.all(request.return_items.map(async (item) => ({
			id: item.id,
			product_id: item.order_item.product_variant.product.id,
			name: item.order_item.product_variant.product.name,
			slug: item.order_item.product_variant.product.slug,
			variant: await mapVariantSummary(item.order_item.product_variant),
			quantity: item.quantity,
			condition: item.condition,
			unit_price: Number(item.order_item.unit_price),
		}))),
		images: await Promise.all(request.return_images.map(async (image) => ({
			id: image.id,
			image_url: await getStorageUrl(image.image_url),
		}))),
		address: request.order.address,
	};
};
