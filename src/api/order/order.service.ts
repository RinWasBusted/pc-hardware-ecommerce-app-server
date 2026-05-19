import { prisma } from '../../utils/prisma.js';
import { getShipmentFee } from '../../utils/shipment.js';
import { getStorageUrl } from '../../utils/storage.js';

export type OrderItemInput = {
	variant_id: number;
	quantity: number;
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

type ShipmentAddress = {
	id: number;
	user_id: number;
	district_id: number | null;
	ward_code: string | null;
};

const getShipmentAddress = async (userId: number, addressId: number): Promise<ShipmentAddress> => {
	const address = await prisma.addresses.findUnique({
		where: { id: addressId },
		select: {
			id: true,
			user_id: true,
			district_id: true,
			ward_code: true,
		},
	});

	if (!address || address.user_id !== userId) {
		throw new Error('Địa chỉ không tồn tại');
	}

	return address;
};

const resolveShipmentDestination = (address: ShipmentAddress) => {
	const toDistrictId = address.district_id ?? NaN;
	const toWardCode = typeof address.ward_code === 'string' ? address.ward_code.trim() : '';

	if (!Number.isInteger(toDistrictId) || toDistrictId <= 0) {
		throw new Error('Địa chỉ chưa có dữ liệu vận chuyển, vui lòng cập nhật địa chỉ');
	}

	if (!toWardCode) {
		throw new Error('Địa chỉ chưa có dữ liệu vận chuyển, vui lòng cập nhật địa chỉ');
	}

	return {
		to_district_id: toDistrictId,
		to_ward_code: toWardCode,
	};
};

const calculateShipmentFeeForAddress = async (userId: number, addressId: number) => {
	const address = await getShipmentAddress(userId, addressId);
	const shipmentDestination = resolveShipmentDestination(address);

	return getShipmentFee(
		shipmentDestination.to_district_id,
		shipmentDestination.to_ward_code,
	);
};

const normalizeItems = (items: OrderItemInput[]) => {
	const map = new Map<number, number>();
	for (const item of items) {
		const current = map.get(item.variant_id) ?? 0;
		map.set(item.variant_id, current + item.quantity);
	}

	return Array.from(map.entries()).map(([variant_id, quantity]) => ({
		variant_id,
		quantity,
	}));
};

const mapOrderItems = async (items: OrderItemRow[]) => {
	return Promise.all(items.map(async (item) => {
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
			image_url: variantImage ? await getStorageUrl(variantImage) : null,
		};
	}));
};

export const GetOrderShipmentFee = async (userId: number, addressId: number) => {
	const shippingFee = await calculateShipmentFeeForAddress(userId, addressId);

	return {
		shipping_fee: shippingFee,
	};
};

export const CreateOrder = async (data: {
	user_id: number;
	address_id: number;
	coupon_id?: number;
	payment_method: 'cod' | 'bank_transfer';
	note?: string;
	items: OrderItemInput[];
}) => {
	const normalizedItems = normalizeItems(data.items);
	if (normalizedItems.length === 0) {
		throw new Error('Danh sách sản phẩm không hợp lệ');
	}

	const shippingFee = await calculateShipmentFeeForAddress(data.user_id, data.address_id);

	return prisma.$transaction(async (tx) => {
		const existingAddress = await tx.addresses.findUnique({
			where: { id: data.address_id },
			select: { id: true, user_id: true },
		});

		if (!existingAddress || existingAddress.user_id !== data.user_id) {
			throw new Error('Địa chỉ không tồn tại');
		}

		const variantIds = normalizedItems.map((item) => item.variant_id);
		const variants = await tx.productVariants.findMany({
			where: {
				id: { in: variantIds },
				is_active: true,
			},
			select: {
				id: true,
				price: true,
				stock: true,
			},
		});

		if (variants.length !== variantIds.length) {
			throw new Error('Có sản phẩm không tồn tại hoặc đã ngừng bán');
		}

		const variantMap = new Map<number, typeof variants[number]>();
		for (const variant of variants) {
			variantMap.set(variant.id, variant);
		}

		let subtotal = 0;
		const orderItems: Array<{ variant_id: number; quantity: number; unit_price: number; subtotal: number }> = [];

		for (const item of normalizedItems) {
			const variant = variantMap.get(item.variant_id);
			if (!variant) {
				throw new Error('Sản phẩm không tồn tại hoặc đã ngừng bán');
			}

			if (item.quantity > variant.stock) {
				throw new Error('Số lượng vượt quá tồn kho');
			}

			const unitPrice = Number(variant.price);
			if (Number.isNaN(unitPrice)) {
				throw new Error('Giá sản phẩm không hợp lệ');
			}

			const lineSubtotal = unitPrice * item.quantity;
			subtotal += lineSubtotal;
			orderItems.push({
				variant_id: item.variant_id,
				quantity: item.quantity,
				unit_price: unitPrice,
				subtotal: lineSubtotal,
			});
		}

		let couponId: number | null = null;
		let discountAmount = 0;

		if (data.coupon_id) {
			const coupon = await tx.coupons.findUnique({
				where: { id: data.coupon_id },
				select: {
					id: true,
					discount_type: true,
					discount_value: true,
					min_order_value: true,
					max_uses: true,
					used_count: true,
					expires_at: true,
					is_active: true,
				},
			});

			if (!coupon || !coupon.is_active) {
				throw new Error('Coupon không tồn tại hoặc đã ngừng hoạt động');
			}

			if (coupon.expires_at && coupon.expires_at.getTime() < Date.now()) {
				throw new Error('Coupon đã hết hạn');
			}

			if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
				throw new Error('Coupon đã hết lượt sử dụng');
			}

			const minOrderValue = coupon.min_order_value ? Number(coupon.min_order_value) : null;
			if (minOrderValue !== null && subtotal < minOrderValue) {
				throw new Error('Giá trị đơn hàng chưa đạt tối thiểu để áp dụng coupon');
			}

			const discountValue = Number(coupon.discount_value);
			if (Number.isNaN(discountValue)) {
				throw new Error('Giá trị giảm giá không hợp lệ');
			}

			discountAmount = coupon.discount_type === 'percent'
				? (subtotal * discountValue) / 100
				: discountValue;
			discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
			couponId = coupon.id;
		}

		const total = Math.max(subtotal - discountAmount + shippingFee, 0);

		const order = await tx.orders.create({
			data: {
				user_id: data.user_id,
				address_id: data.address_id,
				coupon_id: couponId,
				subtotal,
				discount_amount: discountAmount,
				shipping_fee: shippingFee,
				total,
				payment_method: data.payment_method,
				payment_status: 'unpaid',
				order_status: 'pending',
				...(data.note ? { note: data.note } : {}),
			},
			select: { id: true },
		});

		await tx.orderItems.createMany({
			data: orderItems.map((item) => ({
				order_id: order.id,
				variant_id: item.variant_id,
				quantity: item.quantity,
				unit_price: item.unit_price,
				subtotal: item.subtotal,
			})),
		});

		await tx.cartItems.deleteMany({
			where: {
				variant_id: { in: variantIds },
				cart: {
					user_id: data.user_id,
				},
			},
		});

		for (const item of normalizedItems) {
			await tx.productVariants.update({
				where: { id: item.variant_id },
				data: { stock: { decrement: item.quantity } },
			});
		}

		if (couponId) {
			await tx.coupons.update({
				where: { id: couponId },
				data: { used_count: { increment: 1 } },
			});
		}

		await tx.orderStatusLogs.create({
			data: {
				order_id: order.id,
				changed_by: data.user_id,
				old_status: 'pending',
				new_status: 'pending',
				note: 'Tạo đơn hàng',
			},
		});

		return { id: order.id };
	});
};

export const GetMyOrders = async (
	userId: number,
	filters: { order_status?: string; payment_status?: string },
) => {
	const where: any = {
		user_id: userId,
		...(filters.order_status ? { order_status: filters.order_status } : {}),
		...(filters.payment_status ? { payment_status: filters.payment_status } : {}),
	};

	const orders = await prisma.orders.findMany({
		where,
		orderBy: { created_at: 'desc' },
		select: {
			id: true,
			subtotal: true,
			discount_amount: true,
			shipping_fee: true,
			total: true,
			payment_method: true,
			payment_status: true,
			order_status: true,
			note: true,
			created_at: true,
			updated_at: true,
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

	return Promise.all(orders.map(async (order) => ({
		id: order.id,
		subtotal: Number(order.subtotal),
		discount_amount: Number(order.discount_amount),
		shipping_fee: Number(order.shipping_fee),
		total: Number(order.total),
		payment_method: order.payment_method,
		payment_status: order.payment_status,
		order_status: order.order_status,
		note: order.note,
		created_at: order.created_at,
		updated_at: order.updated_at,
		items: await mapOrderItems(order.order_items as OrderItemRow[]),
	})));
};

export const GetOrderDetail = async (userId: number, orderId: number) => {
	const order = await prisma.orders.findFirst({
		where: {
			id: orderId,
			user_id: userId,
		},
		select: {
			id: true,
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
			address: {
				select: {
					id: true,
					recipient: true,
					phone_number: true,
					province: true,
					district: true,
					ward: true,
					street: true,
					province_id: true,
					district_id: true,
					ward_code: true,
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
			order_status_logs: {
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
			},
		},
	});

	if (!order) {
		throw new Error('Đơn hàng không tồn tại');
	}

	const timeline = order.order_status_logs.map((log) => ({
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

	return {
		id: order.id,
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
		items: await mapOrderItems(order.order_items as OrderItemRow[]),
		timeline,
	};
};

export const CancelOrder = async (userId: number, orderId: number, reason: string) => {
	return prisma.$transaction(async (tx) => {
		const order = await tx.orders.findFirst({
			where: {
				id: orderId,
				user_id: userId,
			},
			select: {
				id: true,
				order_status: true,
				coupon_id: true,
			},
		});

		if (!order) {
			throw new Error('Đơn hàng không tồn tại');
		}

		if (order.order_status !== 'pending') {
			throw new Error('Chỉ có thể hủy đơn hàng khi trạng thái là pending');
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

		await tx.orders.update({
			where: { id: order.id },
			data: {
				order_status: 'cancelled',
				cancel_reason: reason,
			},
		});

		await tx.orderStatusLogs.create({
			data: {
				order_id: order.id,
				changed_by: userId,
				old_status: 'pending',
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

		return { id: order.id };
	});
};

export const ConfirmOrderReceived = async (userId: number, orderId: number) => {
	return prisma.$transaction(async (tx) => {
		const order = await tx.orders.findFirst({
			where: {
				id: orderId,
				user_id: userId,
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
			throw new Error('Chỉ có thể xác nhận khi đơn hàng đã giao');
		}

		await tx.orders.update({
			where: { id: order.id },
			data: {
				order_status: 'delivered',
			},
		});

		await tx.orderStatusLogs.create({
			data: {
				order_id: order.id,
				changed_by: userId,
				old_status: 'delivered',
				new_status: 'delivered',
				note: 'Khách xác nhận đã nhận hàng',
			},
		});

		return { id: order.id };
	});
};
