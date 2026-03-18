import { prisma } from '../../utils/prisma.js';
import { getCloudinaryImageUrl } from '../../utils/cloudinary.js';

const ensureCart = async (userId: number) => {
	const existing = await prisma.carts.findUnique({
		where: { user_id: userId },
		select: { id: true },
	});

	if (existing) return existing;

	return prisma.carts.create({
		data: { user_id: userId },
		select: { id: true },
	});
};

const mapCartItems = (cartItems: Array<any>) => {
	return cartItems.map((item) => {
		const variant = item.product_variant;
		const variantImage = variant.product_images?.[0]?.image_url
			?? variant.product?.product_images?.[0]?.image_url
			?? null;

		const price = Number(variant.price);
		const compareAtPrice = variant.compare_at_price ? Number(variant.compare_at_price) : null;

		return {
			id: item.id,
			variant_id: item.variant_id,
			quantity: item.quantity,
			price,
			compare_at_price: compareAtPrice,
			line_total: price * item.quantity,
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
				stock: variant.stock,
				is_active: variant.is_active,
			},
			image_url: variantImage ? getCloudinaryImageUrl(variantImage) : null,
		};
	});
};

const getCartItems = async (userId: number) => {
	const cart = await ensureCart(userId);
	const cartDetail = await prisma.carts.findUnique({
		where: { id: cart.id },
		select: {
			id: true,
			cart_items: {
				orderBy: { added_at: 'desc' },
				select: {
					id: true,
					variant_id: true,
					quantity: true,
					product_variant: {
						select: {
							id: true,
							sku: true,
							version: true,
							color: true,
							color_hex: true,
							price: true,
							compare_at_price: true,
							stock: true,
							is_active: true,
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

	const items = mapCartItems(cartDetail?.cart_items ?? []);
	return items;
};

export const GetCart = async (userId: number) => {
	return getCartItems(userId);
};

const assertVariantAvailable = async (variantId: number) => {
	const variant = await prisma.productVariants.findUnique({
		where: { id: variantId },
		select: {
			id: true,
			stock: true,
			is_active: true,
		},
	});

	if (!variant || !variant.is_active) {
		throw new Error('Biến thể không tồn tại hoặc đã ngừng bán');
	}

	if (variant.stock <= 0) {
		throw new Error('Sản phẩm đã hết hàng');
	}

	return variant;
};

export const AddCartItem = async (userId: number, variantId: number, quantity: number) => {
	const variant = await assertVariantAvailable(variantId);

	if (quantity > variant.stock) {
		throw new Error('Số lượng vượt quá tồn kho');
	}

	const cart = await ensureCart(userId);
	const existingItem = await prisma.cartItems.findUnique({
		where: {
			cart_id_variant_id: {
				cart_id: cart.id,
				variant_id: variantId,
			},
		},
		select: {
			id: true,
			quantity: true,
		},
	});

	if (existingItem) {
		const nextQuantity = existingItem.quantity + quantity;
		if (nextQuantity > variant.stock) {
			throw new Error('Số lượng vượt quá tồn kho');
		}

		await prisma.cartItems.update({
			where: { id: existingItem.id },
			data: { quantity: nextQuantity },
		});
	} else {
		await prisma.cartItems.create({
			data: {
				cart_id: cart.id,
				variant_id: variantId,
				quantity,
			},
		});
	}
};

export const UpdateCartItem = async (userId: number, variantId: number, quantity: number) => {
	const variant = await assertVariantAvailable(variantId);

	if (quantity > variant.stock) {
		throw new Error('Số lượng vượt quá tồn kho');
	}

	const cart = await ensureCart(userId);
	const existingItem = await prisma.cartItems.findUnique({
		where: {
			cart_id_variant_id: {
				cart_id: cart.id,
				variant_id: variantId,
			},
		},
		select: { id: true },
	});

	if (!existingItem) {
		throw new Error('Sản phẩm không có trong giỏ hàng');
	}

	await prisma.cartItems.update({
		where: { id: existingItem.id },
		data: { quantity },
	});
};

export const RemoveCartItem = async (userId: number, variantId: number) => {
	const cart = await ensureCart(userId);
	const existingItem = await prisma.cartItems.findUnique({
		where: {
			cart_id_variant_id: {
				cart_id: cart.id,
				variant_id: variantId,
			},
		},
		select: { id: true },
	});

	if (!existingItem) {
		throw new Error('Sản phẩm không có trong giỏ hàng');
	}

	await prisma.cartItems.delete({ where: { id: existingItem.id } });
	return getCartItems(userId);
};

export const ClearCart = async (userId: number) => {
	const cart = await ensureCart(userId);
	await prisma.cartItems.deleteMany({ where: { cart_id: cart.id } });
	return getCartItems(userId);
};
