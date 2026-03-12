import { prisma } from '../../../utils/prisma.js';
import { getCloudinaryImageUrl } from '../../../utils/cloudinary.js';

export const getLowStockVariants = async (threshold: number) => {
	const variants = await prisma.productVariants.findMany({
		where: {
			stock: { lte: threshold },
		},
		orderBy: [{ stock: 'asc' }, { id: 'asc' }],
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
				},
			},
			product_images: {
				orderBy: { id: 'asc' },
				take: 1,
				select: { image_url: true },
			},
		},
	});

	return variants.map(({ product_images, ...variant }) => ({
		...variant,
		price: Number(variant.price),
		compare_at_price: variant.compare_at_price ? Number(variant.compare_at_price) : null,
		variant_image: product_images[0]?.image_url
			? getCloudinaryImageUrl(product_images[0].image_url)
			: null,
	}));
};

export const createStockInbound = async (entries: Array<{ variant_id: number; change_qty: number; note?: string }>, adminId: number) => {
	return prisma.$transaction(async (tx) => {
		for (const entry of entries) {
			const variant = await tx.productVariants.findUnique({
				where: { id: entry.variant_id },
				select: { id: true },
			});

			if (!variant) {
				throw new Error(`Biến thể không tồn tại: ${entry.variant_id}`);
			}

			await tx.productVariants.update({
				where: { id: entry.variant_id },
				data: { stock: { increment: entry.change_qty } },
			});

			await tx.stockLogs.create({
				data: {
					variant_id: entry.variant_id,
					admin_id: adminId,
					change_qty: entry.change_qty,
					...(entry.note ? { note: entry.note } : {}),
				},
			});
		}

		return { count: entries.length };
	});
};

export const getStockLogs = async (filters: { variantId?: number; date?: string }) => {
	const where: any = {};

	if (filters.variantId) {
		where.variant_id = filters.variantId;
	}

	if (filters.date) {
		const start = new Date(`${filters.date}T00:00:00.000Z`);
		const end = new Date(`${filters.date}T23:59:59.999Z`);
		where.created_at = { gte: start, lte: end };
	}

	const logs = await prisma.stockLogs.findMany({
		where,
		orderBy: { created_at: 'desc' },
		select: {
			id: true,
			variant_id: true,
			admin_id: true,
			change_qty: true,
			note: true,
			created_at: true,
			product_variant: {
				select: {
					id: true,
					sku: true,
					product: {
						select: {
							id: true,
							name: true,
							slug: true,
						},
					},
				},
			},
			admin: {
				select: {
					id: true,
					full_name: true,
					email: true,
				},
			},
		},
	});

	return logs;
};
