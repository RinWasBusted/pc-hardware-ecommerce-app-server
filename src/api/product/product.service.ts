import { Prisma, prisma } from '../../utils/prisma.js';
import { getCloudinaryImageUrl } from '../../utils/cloudinary.js';

export type ProductListFilters = {
	page: number;
	limit: number;
	keyword?: string;
	categoryId?: number;
	brandId?: number;
	priceMin?: number;
	priceMax?: number;
	sort?: 'newest' | 'oldest';
};

const mapProductCard = (product: {
	id: number;
	name: string;
	slug: string;
	status: string;
	brand: { id: number; name: string; logo_url: string | null };
	category: { id: number; name: string; slug: string };
	product_images: Array<{ image_url: string }>;
	product_variants: Array<{ price: any }>;
}) => {
	const prices = product.product_variants
		.map((variant) => Number(variant.price))
		.filter((price) => !Number.isNaN(price));

	const price_min = prices.length > 0 ? Math.min(...prices) : null;
	const price_max = prices.length > 0 ? Math.max(...prices) : null;

	const primaryImage = product.product_images[0]?.image_url ?? null;

	return {
		id: product.id,
		name: product.name,
		slug: product.slug,
		status: product.status,
		category: product.category,
		brand: {
			...product.brand,
			logo_url: product.brand.logo_url
				? getCloudinaryImageUrl(product.brand.logo_url)
				: null,
		},
		primary_image: primaryImage ? getCloudinaryImageUrl(primaryImage) : null,
		price_min,
		price_max,
	};
};

export const GetProducts = async (filters: ProductListFilters) => {
	const { page, limit, keyword, categoryId, brandId, priceMin, priceMax, sort } = filters;

	const where: any = {
		status: 'available',
	};

	if (keyword) {
		where.name = {
			contains: keyword,
			mode: 'insensitive',
		};
	}

	if (categoryId) {
		where.category_id = categoryId;
	}

	if (brandId) {
		where.brand_id = brandId;
	}

	if (priceMin !== undefined || priceMax !== undefined) {
		where.product_variants = {
			some: {
				is_active: true,
				price: {
					...(priceMin !== undefined ? { gte: priceMin } : {}),
					...(priceMax !== undefined ? { lte: priceMax } : {}),
				},
			},
		};
	}

	const orderBy: Prisma.ProductsOrderByWithRelationInput = {
    created_at: sort === 'oldest' ? 'asc' : 'desc'
};

	const [total, products] = await Promise.all([
		prisma.products.count({ where }),
		prisma.products.findMany({
			where,
			orderBy,
			skip: (page - 1) * limit,
			take: limit,
			select: {
				id: true,
				name: true,
				slug: true,
				status: true,
				category: {
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
				brand: {
					select: {
						id: true,
						name: true,
						logo_url: true,
					},
				},
				product_images: {
					orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
					take: 1,
					select: { image_url: true },
				},
				product_variants: {
					where: { is_active: true },
					select: { price: true },
				},
			},
		}),
	]);

	const items = products.map(mapProductCard);
	const totalPages = Math.ceil(total / limit);

	return {
		items,
		pagination: {
			page,
			limit,
			total,
			total_pages: totalPages,
		},
	};
};

export const GetProductDetailBySlug = async (slug: string) => {
	const product = await prisma.products.findFirst({
		where: {
			slug,
			status: 'available',
		},
		select: {
			id: true,
			sku: true,
			name: true,
			slug: true,
			description: true,
			specifications: true,
			status: true,
			created_at: true,
			updated_at: true,
			category: {
				select: {
					id: true,
					name: true,
					slug: true,
				},
			},
			brand: {
				select: {
					id: true,
					name: true,
					logo_url: true,
				},
			},
			product_variants: {
				where: { is_active: true },
				select: {
					id: true,
					sku: true,
					version: true,
					color: true,
					color_hex: true,
					price: true,
					compare_at_price: true,
					stock: true,
				},
				orderBy: { price: 'asc' },
			},
			product_images: {
				orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
				select: {
					id: true,
					variant_id: true,
					image_url: true,
					is_primary: true,
					sort_order: true,
				},
			},
		},
	});

	if (!product) {
		throw new Error('Sản phẩm không tồn tại');
	}

	const variantImageMap = new Map<number, string>();
	const productImages = product.product_images
		.filter((image) => image.variant_id === null)
		.map((image) => ({
			id: image.id,
			image_url: getCloudinaryImageUrl(image.image_url),
			is_primary: image.is_primary,
			sort_order: image.sort_order,
		}));

	for (const image of product.product_images) {
		if (image.variant_id !== null && !variantImageMap.has(image.variant_id)) {
			variantImageMap.set(image.variant_id, getCloudinaryImageUrl(image.image_url));
		}
	}

	const variants = product.product_variants.map((variant) => ({
		...variant,
		price: Number(variant.price),
		compare_at_price: variant.compare_at_price ? Number(variant.compare_at_price) : null,
		variant_image: variantImageMap.get(variant.id) ?? null,
	}));

	return {
		id: product.id,
		sku: product.sku,
		name: product.name,
		slug: product.slug,
		description: product.description,
		specifications: product.specifications,
		status: product.status,
		created_at: product.created_at,
		updated_at: product.updated_at,
		category: product.category,
		brand: {
			...product.brand,
			logo_url: product.brand.logo_url
				? getCloudinaryImageUrl(product.brand.logo_url)
				: null,
		},
		images: productImages,
		variants,
	};
};

export const GetProductsByCategory = async (categoryId: number, limit: number) => {
	const products = await prisma.products.findMany({
		where: {
			category_id: categoryId,
			status: 'available',
		},
		orderBy: { created_at: 'desc' },
		take: limit,
		select: {
			id: true,
			name: true,
			slug: true,
			status: true,
			category: {
				select: {
					id: true,
					name: true,
					slug: true,
				},
			},
			brand: {
				select: {
					id: true,
					name: true,
					logo_url: true,
				},
			},
			product_images: {
				orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
				take: 1,
				select: { image_url: true },
			},
			product_variants: {
				where: { is_active: true },
				select: { price: true },
			},
		},
	});

	return products.map(mapProductCard);
};
