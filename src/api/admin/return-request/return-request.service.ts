import { prisma } from '../../../utils/prisma.js';
import { getStorageUrl } from '../../../utils/storage.js';
import { NotificationType } from '@prisma/client';
import { createNotification } from '../../notification/notification.service.js';

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

	return Promise.all(requests.map(async (request) => ({
		id: request.id,
		order_id: request.order_id,
		user: request.user,
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

export const ApproveAdminReturnRequest = async (
	requestId: number,
	adminId: number,
	adminNote?: string,
) => {
	return prisma.$transaction(async (tx) => {
		const request = await tx.returnRequests.findUnique({
			where: { id: requestId },
			select: {
				id: true,
				status: true,
				user_id: true,
				order: {
					select: {
						total: true,
					},
				},
			},
		});

		if (!request) {
			throw new Error('Yêu cầu trả hàng không tồn tại');
		}

		if (request.status !== 'pending') {
			throw new Error('Chỉ có thể duyệt yêu cầu đang ở trạng thái pending');
		}

		const refundAmount = Number(request.order.total);
		if (Number.isNaN(refundAmount) || refundAmount < 0) {
			throw new Error('total của đơn hàng không hợp lệ');
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

		createNotification(
			[request.user_id],
			NotificationType.order,
			'Yêu cầu trả hàng được duyệt',
			`Yêu cầu trả hàng #${request.id} của bạn đã được duyệt. Số tiền hoàn: ${refundAmount.toLocaleString('vi-VN')} VNĐ.`,
			{ return_request_id: request.id, status: 'approved' }
		).catch((err) => {
			console.error('Lỗi khi gửi thông báo duyệt trả hàng:', err);
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
				user_id: true,
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

		createNotification(
			[request.user_id],
			NotificationType.order,
			'Yêu cầu trả hàng bị từ chối',
			`Yêu cầu trả hàng #${request.id} của bạn đã bị từ chối. Lý do: ${adminNote}`,
			{ return_request_id: request.id, status: 'rejected' }
		).catch((err) => {
			console.error('Lỗi khi gửi thông báo từ chối trả hàng:', err);
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
				user_id: true,
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

		createNotification(
			[request.user_id],
			NotificationType.order,
			'Đã nhận sản phẩm trả về',
			`Cửa hàng đã nhận được sản phẩm từ yêu cầu trả hàng #${request.id} của bạn.`,
			{ return_request_id: request.id, status: 'received' }
		).catch((err) => {
			console.error('Lỗi khi gửi thông báo đã nhận hàng trả về:', err);
		});

		return {
			id: updated.id,
			status: updated.status,
			admin_note: updated.admin_note,
			refund_amount: Number(updated.refund_amount),
		};
	});
};

export const RefundAdminReturnRequest = async (requestId: number, adminId: number) => {
	return prisma.$transaction(async (tx) => {
		const request = await tx.returnRequests.findUnique({
			where: { id: requestId },
			select: {
				id: true,
				status: true,
				order_id: true,
				user_id: true,
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
			throw new Error('Chỉ có thể hoàn tiền khi yêu cầu ở trạng thái received');
		}

		const cancelReason = `Hoàn tiền cho yêu cầu trả hàng #${request.id}`;

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
				order_status: 'cancelled',
				cancel_reason: cancelReason,
			},
		});

		if (request.order.order_status !== 'cancelled') {
			await tx.orderStatusLogs.create({
				data: {
					order_id: request.order_id,
					changed_by: adminId,
					old_status: request.order.order_status,
					new_status: 'cancelled',
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

		createNotification(
			[request.user_id],
			NotificationType.order,
			'Hoàn tiền thành công',
			`Yêu cầu trả hàng #${request.id} đã hoàn tất. Số tiền hoàn trả đã được chuyển thành công.`,
			{ return_request_id: request.id, status: 'completed' }
		).catch((err) => {
			console.error('Lỗi khi gửi thông báo hoàn tiền:', err);
		});

		return {
			id: request.id,
			status: 'completed',
			order_id: request.order_id,
			order_status: 'cancelled',
			payment_status: 'refunded',
			cancel_reason: cancelReason,
		};
	});
};
