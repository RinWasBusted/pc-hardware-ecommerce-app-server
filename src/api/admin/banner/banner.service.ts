import { prisma } from '../../../utils/prisma.js';
import { deleteFromStorage, getStorageUrl, uploadToStorage } from '../../../utils/storage.js';

type BannerRecord = {
	id: number;
	image_url: string;
	link_url: string | null;
	sort_order: number;
	is_active: boolean;
};

const mapBannerResponse = async (banner: BannerRecord) => ({
	...banner,
	image_url: await getStorageUrl(banner.image_url),
});

type GetBannersParams = {
	sort: 'asc' | 'desc';
	isActive?: boolean;
};

export const GetBanners = async ({ sort, isActive }: GetBannersParams) => {
	const banners = await prisma.banners.findMany({
		where: {
			...(isActive !== undefined && { is_active: isActive }),
		},
		orderBy: {
			sort_order: sort,
		},
		select: {
			id: true,
			image_url: true,
			link_url: true,
			sort_order: true,
			is_active: true,
		},
	});

	return Promise.all(banners.map(mapBannerResponse));
};

export const CreateBanner = async (
	imageFile: Express.Multer.File,
	linkUrl?: string,
	isActive: boolean = true
) => {
	const uploadedImageKey = await uploadToStorage(imageFile, 'pc-hardware-ecommerce/banners');

	try {
		// Start a transaction to ensure atomicity
		const banner = await prisma.$transaction(async (tx) => {
			// Increment all existing banners' sort_order by 1
			await tx.banners.updateMany({
				data: {
					sort_order: {
						increment: 1,
					},
				},
			});

			// Create the new banner with sort_order = 1 (first order)
			return tx.banners.create({
				data: {
					image_url: uploadedImageKey,
					link_url: linkUrl || null,
					sort_order: 1,
					is_active: isActive,
				},
				select: {
					id: true,
					image_url: true,
					link_url: true,
					sort_order: true,
					is_active: true,
				},
			});
		});

		return mapBannerResponse(banner);
	} catch (error) {
		await deleteFromStorage(uploadedImageKey).catch(() => undefined);
		throw error;
	}
};

type UpdateBannerPayload = {
	imageFile?: Express.Multer.File;
	linkUrl?: string | null;
	sortOrder?: number;
	isActive?: boolean;
};

export const UpdateBanner = async (bannerId: number, payload: UpdateBannerPayload) => {
	const existing = await prisma.banners.findUnique({
		where: { id: bannerId },
		select: {
			id: true,
			image_url: true,
			link_url: true,
			sort_order: true,
			is_active: true,
		},
	});

	if (!existing) {
		throw new Error('Banner không tồn tại');
	}

	const uploadedImageKey = payload.imageFile
		? await uploadToStorage(payload.imageFile, 'pc-hardware-ecommerce/banners')
		: undefined;

	try {
		const banner = await prisma.$transaction(async (tx) => {
			if (payload.sortOrder !== undefined && payload.sortOrder !== existing.sort_order) {
				const bannerWithSameOrder = await tx.banners.findFirst({
					where: {
						sort_order: payload.sortOrder,
						NOT: { id: bannerId },
					},
					select: { id: true },
				});

				if (bannerWithSameOrder) {
					await tx.banners.update({
						where: { id: bannerWithSameOrder.id },
						data: { sort_order: existing.sort_order },
					});
				}
			}

			return tx.banners.update({
				where: { id: bannerId },
				data: {
					...(uploadedImageKey !== undefined && { image_url: uploadedImageKey }),
					...(payload.linkUrl !== undefined && { link_url: payload.linkUrl }),
					...(payload.sortOrder !== undefined && { sort_order: payload.sortOrder }),
					...(payload.isActive !== undefined && { is_active: payload.isActive }),
				},
				select: {
					id: true,
					image_url: true,
					link_url: true,
					sort_order: true,
					is_active: true,
				},
			});
		});

		if (uploadedImageKey && existing.image_url && existing.image_url !== uploadedImageKey) {
			await deleteFromStorage(existing.image_url).catch(() => undefined);
		}

		return mapBannerResponse(banner);
	} catch (error) {
		if (uploadedImageKey) {
			await deleteFromStorage(uploadedImageKey).catch(() => undefined);
		}
		throw error;
	}
};

export const DeleteBanner = async (bannerId: number) => {
	const existing = await prisma.banners.findUnique({
		where: { id: bannerId },
		select: {
			id: true,
			image_url: true,
			sort_order: true,
		},
	});

	if (!existing) {
		throw new Error('Banner không tồn tại');
	}

	await prisma.$transaction(async (tx) => {
		await tx.banners.delete({
			where: { id: bannerId },
		});

		await tx.banners.updateMany({
			where: {
				sort_order: {
					gt: existing.sort_order,
				},
			},
			data: {
				sort_order: {
					decrement: 1,
				},
			},
		});
	});

	await deleteFromStorage(existing.image_url).catch(() => undefined);

	return { id: existing.id };
};
