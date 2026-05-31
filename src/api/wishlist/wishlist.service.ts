import { prisma } from '../../utils/prisma.js';
import { getStorageUrl } from '../../utils/storage.js';
import AppError from '../../utils/appError.js';

export const AddToWishlist = async (userId: number, productId: number) => {
	const product = await prisma.products.findUnique({
		where: { id: productId },
	});

	if (!product) {
		throw new AppError('Sản phẩm không tồn tại', 404);
	}

	const existing = await prisma.wishlists.findUnique({
		where: {
			user_id_product_id: {
				user_id: userId,
				product_id: productId,
			},
		},
	});

	if (existing) {
		throw new AppError('Sản phẩm đã có trong danh sách yêu thích', 400);
	}

	const wishlistItem = await prisma.wishlists.create({
		data: {
			user_id: userId,
			product_id: productId,
		},
	});

	return wishlistItem;
};

export const GetWishlist = async (userId: number) => {
	const wishlist = await prisma.wishlists.findMany({
		where: { user_id: userId },
		include: {
			product: {
				include: {
					category: true,
					brand: true,
					product_images: {
						where: { is_primary: true },
						take: 1,
					},
					product_variants: {
						select: {
							price: true,
						},
					},
				},
			},
		},
		orderBy: {
			added_at: 'desc',
		},
	});

	const mappedWishlist = await Promise.all(
		wishlist.map(async (item) => {
			const product = item.product;
			const prices = product.product_variants
				.map((variant) => Number(variant.price))
				.filter((price) => !Number.isNaN(price));

			const price_min = prices.length > 0 ? Math.min(...prices) : null;
			const price_max = prices.length > 0 ? Math.max(...prices) : null;

			const primaryImage = product.product_images[0]?.image_url ?? null;

			return {
				id: item.id,
				added_at: item.added_at,
				product: {
					id: product.id,
					name: product.name,
					slug: product.slug,
					status: product.status,
					category: {
						id: product.category.id,
						name: product.category.name,
						slug: product.category.slug,
					},
					brand: {
						id: product.brand.id,
						name: product.brand.name,
						logo_url: product.brand.logo_url
							? await getStorageUrl(product.brand.logo_url)
							: null,
					},
					primary_image: primaryImage
						? await getStorageUrl(primaryImage)
						: null,
					price_min,
					price_max,
				},
			};
		})
	);

	return mappedWishlist;
};

export const RemoveFromWishlist = async (userId: number, productId: number) => {
	const existing = await prisma.wishlists.findUnique({
		where: {
			user_id_product_id: {
				user_id: userId,
				product_id: productId,
			},
		},
	});

	if (!existing) {
		throw new AppError('Sản phẩm không có trong danh sách yêu thích', 404);
	}

	await prisma.wishlists.delete({
		where: {
			user_id_product_id: {
				user_id: userId,
				product_id: productId,
			},
		},
	});
};
