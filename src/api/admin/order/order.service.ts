import { prisma } from '../../../utils/prisma.js';
import { getCloudinaryImageUrl } from '../../../utils/cloudinary.js';
import { OrderStatus } from '@prisma/client';

export type AdminOrderListFilters = {
	status?: string;
	payment_status?: string;
	user_id?: number;
	date_from?: Date;
	date_to?: Date;
	search?: string;
};

type OrderItemRow = {
	id: number;
	variant_id: number;
	quantity: number;
	unit_price: any;
	subtotal: any;
	product_variant: {
		id: number;
		sku: string;
		version: string | null;
		color: string | null;
		color_hex: string | null;
		product: {
			id: number;
			name: string;
			slug: string;
			product_images: Array<{ image_url: string }>;
		};
		product_images: Array<{ image_url: string }>;
	};
};

const mapOrderItems = (items: OrderItemRow[]) => {
	return items.map((item) => {
		const variant = item.product_variant;
		const variantImage = variant.product_images?.[0]?.image_url
			?? variant.product?.product_images?.[0]?.image_url
			?? null;

		return {
			id: item.id,
			variant_id: item.variant_id,
			quantity: item.quantity,
			unit_price: Number(item.unit_price),
			subtotal: Number(item.subtotal),
			product: {
				id: variant.product.id,
				name: variant.product.name,
				slug: variant.product.slug,
			},
			variant: {
				id: variant.id,
				sku: variant.sku,
				version: variant.version,
				color: variant.color,
				color_hex: variant.color_hex,
			},
			image_url: variantImage ? getCloudinaryImageUrl(variantImage) : null,
		};
	});
};

export const GetAdminOrders = async (filters: AdminOrderListFilters) => {
	const where: any = {};

	if (filters.status) {
		where.order_status = filters.status;
	}

	if (filters.payment_status) {
		where.payment_status = filters.payment_status;
	}

	if (filters.user_id) {
		where.user_id = filters.user_id;
	}

	if (filters.date_from || filters.date_to) {
		where.created_at = {
			...(filters.date_from ? { gte: filters.date_from } : {}),
			...(filters.date_to ? { lte: filters.date_to } : {}),
		};
	}

	if (filters.search) {
		const searchValue = filters.search.trim();
		const or: any[] = [
			{
				user: {
					full_name: {
						contains: searchValue,
						mode: 'insensitive',
					},
				},
			},
		];

		const numericId = Number(searchValue);
		if (!Number.isNaN(numericId)) {
			or.push({ id: numericId });
		}

		where.OR = or;
	}

	const orders = await prisma.orders.findMany({
		where,
		orderBy: { created_at: 'desc' },
		select: {
			id: true,
			user_id: true,
			subtotal: true,
			discount_amount: true,
			shipping_fee: true,
			total: true,
			payment_method: true,
			payment_status: true,
			order_status: true,
			cancel_reason: true,
			note: true,
			created_at: true,
			updated_at: true,
			user: {
				select: {
					id: true,
					full_name: true,
					email: true,
					phone_number: true,
				},
			},
		},
	});

	return orders.map((order) => ({
		id: order.id,
		user: order.user,
		subtotal: Number(order.subtotal),
		discount_amount: Number(order.discount_amount),
		shipping_fee: Number(order.shipping_fee),
		total: Number(order.total),
		payment_method: order.payment_method,
		payment_status: order.payment_status,
		order_status: order.order_status,
		cancel_reason: order.cancel_reason,
		note: order.note,
		created_at: order.created_at,
		updated_at: order.updated_at,
	}));
};

export const GetAdminOrderDetail = async (orderId: number) => {
	const order = await prisma.orders.findUnique({
		where: { id: orderId },
		select: {
			id: true,
			user_id: true,
			subtotal: true,
			discount_amount: true,
			shipping_fee: true,
			total: true,
			payment_method: true,
			payment_status: true,
			order_status: true,
			cancel_reason: true,
			note: true,
			created_at: true,
			updated_at: true,
			user: {
				select: {
					id: true,
					full_name: true,
					email: true,
					phone_number: true,
				},
			},
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
			coupon: {
				select: {
					id: true,
					code: true,
					discount_type: true,
					discount_value: true,
					min_order_value: true,
				},
			},
			order_items: {
				select: {
					id: true,
					variant_id: true,
					quantity: true,
					unit_price: true,
					subtotal: true,
					product_variant: {
						select: {
							id: true,
							sku: true,
							version: true,
							color: true,
							color_hex: true,
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
	});

	if (!order) {
		throw new Error('Đơn hàng không tồn tại');
	}

	return {
		id: order.id,
		user: order.user,
		subtotal: Number(order.subtotal),
		discount_amount: Number(order.discount_amount),
		shipping_fee: Number(order.shipping_fee),
		total: Number(order.total),
		payment_method: order.payment_method,
		payment_status: order.payment_status,
		order_status: order.order_status,
		cancel_reason: order.cancel_reason,
		note: order.note,
		created_at: order.created_at,
		updated_at: order.updated_at,
		address: order.address,
		coupon: order.coupon
			? {
				id: order.coupon.id,
				code: order.coupon.code,
				discount_type: order.coupon.discount_type,
				discount_value: Number(order.coupon.discount_value),
				min_order_value: order.coupon.min_order_value
					? Number(order.coupon.min_order_value)
					: null,
			}
			: null,
		items: mapOrderItems(order.order_items as OrderItemRow[]),
	};
};

export const UpdateAdminOrderStatus = async (
	orderId: number,
	adminId: number,
	newStatus: string,
	note?: string,
) => {
	return prisma.$transaction(async (tx) => {
		const order = await tx.orders.findUnique({
			where: { id: orderId },
			select: { id: true, order_status: true },
		});

		if (!order) {
			throw new Error('Đơn hàng không tồn tại');
		}

		if (order.order_status === newStatus) {
			throw new Error('Trạng thái đơn hàng không thay đổi');
		}

        const validStatuses = Object.values(OrderStatus);
        if (!validStatuses.includes(newStatus as OrderStatus)) {
            throw new Error('Trạng thái đơn hàng không hợp lệ');
        }

		const updated = await tx.orders.update({
			where: { id: order.id },
			data: {
				order_status: newStatus as OrderStatus,
			},
			select: {
				id: true,
				order_status: true,
				updated_at: true,
			},
		});

		await tx.orderStatusLogs.create({
			data: {
				order_id: order.id,
				changed_by: adminId,
				old_status: order.order_status,
				new_status: newStatus as OrderStatus,
				...(note ? { note } : {}),
			},
		});

		return updated;
	});
};

export const CancelAdminOrder = async (orderId: number, adminId: number, reason: string) => {
	return prisma.$transaction(async (tx) => {
		const order = await tx.orders.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				order_status: true,
				coupon_id: true,
			},
		});

		if (!order) {
			throw new Error('Đơn hàng không tồn tại');
		}

		if (order.order_status === 'cancelled') {
			throw new Error('Đơn hàng đã bị hủy');
		}

		if (order.order_status === 'delivered') {
			throw new Error('Không thể hủy đơn hàng đã giao');
		}

		const orderItems = await tx.orderItems.findMany({
			where: { order_id: order.id },
			select: { variant_id: true, quantity: true },
		});

		for (const item of orderItems) {
			await tx.productVariants.update({
				where: { id: item.variant_id },
				data: { stock: { increment: item.quantity } },
			});
		}

		const updated = await tx.orders.update({
			where: { id: order.id },
			data: {
				order_status: 'cancelled',
				cancel_reason: reason,
			},
			select: {
				id: true,
				order_status: true,
				cancel_reason: true,
				updated_at: true,
			},
		});

		await tx.orderStatusLogs.create({
			data: {
				order_id: order.id,
				changed_by: adminId,
				old_status: order.order_status,
				new_status: 'cancelled',
				note: reason,
			},
		});

		if (order.coupon_id) {
			const coupon = await tx.coupons.findUnique({
				where: { id: order.coupon_id },
				select: { used_count: true },
			});

			if (coupon && coupon.used_count > 0) {
				await tx.coupons.update({
					where: { id: order.coupon_id },
					data: { used_count: { decrement: 1 } },
				});
			}
		}

		return updated;
	});
};

export const GetAdminOrderStatusLogs = async (orderId: number) => {
	const order = await prisma.orders.findUnique({
		where: { id: orderId },
		select: { id: true },
	});

	if (!order) {
		throw new Error('Đơn hàng không tồn tại');
	}

	const logs = await prisma.orderStatusLogs.findMany({
		where: { order_id: orderId },
		orderBy: { changed_at: 'asc' },
		select: {
			id: true,
			old_status: true,
			new_status: true,
			note: true,
			changed_at: true,
			admin: {
				select: {
					id: true,
					full_name: true,
					role: true,
				},
			},
		},
	});

	return logs.map((log) => ({
		id: log.id,
		old_status: log.old_status,
		new_status: log.new_status,
		note: log.note,
		changed_at: log.changed_at,
		changed_by: log.admin
			? {
				id: log.admin.id,
				full_name: log.admin.full_name,
				role: log.admin.role,
			}
			: null,
	}));
};
