import { prisma } from '../../../utils/prisma.js';
import { getCloudinaryImageUrl } from '../../../utils/cloudinary.js';

export type AdminReturnRequestListFilters = {
	status?: string;
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
	const imagePublicId = variant.product_images[0]?.image_url
		?? variant.product.product_images[0]?.image_url
		?? null;

	return imagePublicId ? getCloudinaryImageUrl(imagePublicId) : null;
};

const mapVariantSummary = (variant: VariantSummary) => ({
	id: variant.id,
	version: variant.version,
	color: variant.color,
	color_hex: variant.color_hex,
	image_url: getVariantImageUrl(variant),
});

export const GetAdminReturnRequests = async (filters: AdminReturnRequestListFilters) => {
	const where: any = {};

	if (filters.status) {
		where.status = filters.status;
	}

	const requests = await prisma.returnRequests.findMany({
		where,
		orderBy: { created_at: 'desc' },
		select: {
			id: true,
			order_id: true,
			reason: true,
			status: true,
			admin_note: true,
			refund_amount: true,
			created_at: true,
			user: {
				select: {
					id: true,
					full_name: true,
					email: true,
					phone_number: true,
				},
			},
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

	return requests.map((request) => ({
		id: request.id,
		order_id: request.order_id,
		user: request.user,
		reason: request.reason,
		status: request.status,
		admin_note: request.admin_note,
		refund_amount: Number(request.refund_amount),
		created_at: request.created_at,
		return_items: request.return_items.map((item) => ({
			id: item.id,
			name: item.order_item.product_variant.product.name,
			slug: item.order_item.product_variant.product.slug,
			variant: mapVariantSummary(item.order_item.product_variant),
			quantity: item.quantity,
		})),
	}));
};

export const GetAdminReturnRequestDetail = async (requestId: number) => {
	const request = await prisma.returnRequests.findUnique({
		where: { id: requestId },
		select: {
			id: true,
			order_id: true,
			reason: true,
			status: true,
			admin_note: true,
			refund_amount: true,
			created_at: true,
			user: {
				select: {
					id: true,
					full_name: true,
					email: true,
					phone_number: true,
				},
			},
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
		order_id: request.order_id,
		user: request.user,
		reason: request.reason,
		status: request.status,
		admin_note: request.admin_note,
		refund_amount: Number(request.refund_amount),
		created_at: request.created_at,
		return_items: request.return_items.map((item) => ({
			id: item.id,
			product_id: item.order_item.product_variant.product.id,
			name: item.order_item.product_variant.product.name,
			slug: item.order_item.product_variant.product.slug,
			variant: mapVariantSummary(item.order_item.product_variant),
			quantity: item.quantity,
			condition: item.condition,
			unit_price: Number(item.order_item.unit_price),
		})),
		images: request.return_images.map((image) => ({
			id: image.id,
			image_url: getCloudinaryImageUrl(image.image_url),
		})),
		address: request.order.address,
	};
};

export const ApproveAdminReturnRequest = async (
	requestId: number,
	adminId: number,
	refundAmount: number,
	adminNote?: string,
) => {
	return prisma.$transaction(async (tx) => {
		const request = await tx.returnRequests.findUnique({
			where: { id: requestId },
			select: {
				id: true,
				status: true,
				refund_amount: true,
			},
		});

		if (!request) {
			throw new Error('Yêu cầu trả hàng không tồn tại');
		}

		if (request.status !== 'pending') {
			throw new Error('Chỉ có thể duyệt yêu cầu đang ở trạng thái pending');
		}

		const maxRefundAmount = Number(request.refund_amount);
		if (Number.isNaN(maxRefundAmount)) {
			throw new Error('refund_amount hiện tại không hợp lệ');
		}

		if (refundAmount < 0 || refundAmount > maxRefundAmount) {
			throw new Error('refund_amount không hợp lệ');
		}

		const updated = await tx.returnRequests.update({
			where: { id: request.id },
			data: {
				status: 'approved',
				refund_amount: refundAmount,
				...(adminNote !== undefined ? { admin_note: adminNote || null } : {}),
			},
			select: {
				id: true,
				status: true,
				admin_note: true,
				refund_amount: true,
			},
		});

		return {
			id: updated.id,
			status: updated.status,
			admin_note: updated.admin_note,
			refund_amount: Number(updated.refund_amount),
		};
	});
};

export const RejectAdminReturnRequest = async (
	requestId: number,
	adminId: number,
	adminNote: string,
) => {
	return prisma.$transaction(async (tx) => {
		const request = await tx.returnRequests.findUnique({
			where: { id: requestId },
			select: {
				id: true,
				status: true,
			},
		});

		if (!request) {
			throw new Error('Yêu cầu trả hàng không tồn tại');
		}

		if (request.status !== 'pending') {
			throw new Error('Chỉ có thể từ chối yêu cầu đang ở trạng thái pending');
		}

		const updated = await tx.returnRequests.update({
			where: { id: request.id },
			data: {
				status: 'rejected',
				admin_note: adminNote,
				refund_amount: 0,
			},
			select: {
				id: true,
				status: true,
				admin_note: true,
				refund_amount: true,
			},
		});

		return {
			id: updated.id,
			status: updated.status,
			admin_note: updated.admin_note,
			refund_amount: Number(updated.refund_amount),
		};
	});
};

export const MarkAdminReturnRequestReceived = async (requestId: number, adminId: number) => {
	return prisma.$transaction(async (tx) => {
		const request = await tx.returnRequests.findUnique({
			where: { id: requestId },
			select: {
				id: true,
				status: true,
				return_items: {
					select: {
						id: true,
						quantity: true,
						order_item: {
							select: {
								variant_id: true,
							},
						},
					},
				},
			},
		});

		if (!request) {
			throw new Error('Yêu cầu trả hàng không tồn tại');
		}

		if (request.status !== 'approved') {
			throw new Error('Chỉ có thể xác nhận đã nhận hàng khi yêu cầu ở trạng thái approved');
		}

		for (const item of request.return_items) {
			await tx.productVariants.update({
				where: { id: item.order_item.variant_id },
				data: { stock: { increment: item.quantity } },
			});

			await tx.stockLogs.create({
				data: {
					variant_id: item.order_item.variant_id,
					admin_id: adminId,
					change_qty: item.quantity,
					note: `Nhận hàng trả về từ yêu cầu #${request.id}`,
				},
			});
		}

		const updated = await tx.returnRequests.update({
			where: { id: request.id },
			data: {
				status: 'received',
			},
			select: {
				id: true,
				status: true,
				admin_note: true,
				refund_amount: true,
			},
		});

		return {
			id: updated.id,
			status: updated.status,
			admin_note: updated.admin_note,
			refund_amount: Number(updated.refund_amount),
		};
	});
};

export const CompleteAdminReturnRequest = async (requestId: number, adminId: number) => {
	return prisma.$transaction(async (tx) => {
		const request = await tx.returnRequests.findUnique({
			where: { id: requestId },
			select: {
				id: true,
				status: true,
				order_id: true,
				order: {
					select: {
						id: true,
						order_status: true,
						payment_status: true,
					},
				},
			},
		});

		if (!request) {
			throw new Error('Yêu cầu trả hàng không tồn tại');
		}

		if (request.status !== 'received') {
			throw new Error('Chỉ có thể hoàn tất yêu cầu khi trạng thái là received');
		}

		const cancelReason = `Hoàn tất trả hàng/hoàn tiền cho yêu cầu #${request.id}`;

		await tx.returnRequests.update({
			where: { id: request.id },
			data: {
				status: 'completed',
			},
		});

		await tx.orders.update({
			where: { id: request.order_id },
			data: {
				payment_status: 'refunded',
				order_status: 'failed',
				cancel_reason: cancelReason,
			},
		});

		if (request.order.order_status !== 'failed') {
			await tx.orderStatusLogs.create({
				data: {
					order_id: request.order_id,
					changed_by: adminId,
					old_status: request.order.order_status,
					new_status: 'failed',
					note: cancelReason,
				},
			});
		}

		await tx.payments.updateMany({
			where: {
				order_id: request.order_id,
				payment_status: 'success',
			},
			data: {
				payment_status: 'refunded',
			},
		});

		return {
			id: request.id,
			status: 'completed',
			order_id: request.order_id,
			order_status: 'failed',
			payment_status: 'refunded',
			cancel_reason: cancelReason,
		};
	});
};
