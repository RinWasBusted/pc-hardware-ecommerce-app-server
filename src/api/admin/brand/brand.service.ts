import { prisma } from '../../../utils/prisma.js';
import { deleteFromStorage, getStorageUrl, uploadToStorage } from '../../../utils/storage.js';

type BrandRecord = {
	id: number;
	name: string;
	logo_url: string | null;
};

const mapBrandResponse = async (brand: BrandRecord) => ({
	...brand,
	logo_url: brand.logo_url ? await getStorageUrl(brand.logo_url) : null,
});

export const CreateBrand = async (name: string, logoFile: Express.Multer.File) => {
	const existing = await prisma.brands.findUnique({
		where: { name },
		select: { id: true },
	});

	if (existing) {
		throw new Error('Tên thương hiệu đã tồn tại');
	}

	const uploadedLogoKey = await uploadToStorage(logoFile, 'pc-hardware-ecommerce/brands');

	try {
		const brand = await prisma.brands.create({
			data: {
				name,
				logo_url: uploadedLogoKey,
			},
			select: {
				id: true,
				name: true,
				logo_url: true,
			},
		});

		return mapBrandResponse(brand);
	} catch (error) {
		await deleteFromStorage(uploadedLogoKey).catch(() => undefined);
		throw error;
	}
};

export const UpdateBrand = async (brandId: number, name: string, logoFile?: Express.Multer.File) => {
	const existing = await prisma.brands.findUnique({
		where: { id: brandId },
		select: { id: true, logo_url: true },
	});

	if (!existing) {
		throw new Error('Thương hiệu không tồn tại');
	}

	const duplicate = await prisma.brands.findFirst({
		where: { name, NOT: { id: brandId } },
		select: { id: true },
	});

	if (duplicate) {
		throw new Error('Tên thương hiệu đã tồn tại');
	}

	if (!logoFile) {
		const brand = await prisma.brands.update({
			where: { id: brandId },
			data: {
				name,
			},
			select: {
				id: true,
				name: true,
				logo_url: true,
			},
		});

		return mapBrandResponse(brand);
	}

	const uploadedLogoKey = await uploadToStorage(logoFile, 'pc-hardware-ecommerce/brands');

	try {
		const brand = await prisma.brands.update({
			where: { id: brandId },
			data: {
				name,
				logo_url: uploadedLogoKey,
			},
			select: {
				id: true,
				name: true,
				logo_url: true,
			},
		});

		if (existing.logo_url && existing.logo_url !== uploadedLogoKey) {
			await deleteFromStorage(existing.logo_url).catch(() => undefined);
		}

		return mapBrandResponse(brand);
	} catch (error) {
		await deleteFromStorage(uploadedLogoKey).catch(() => undefined);
		throw error;
	}
};

export const DeleteBrand = async (brandId: number) => {
	const existing = await prisma.brands.findUnique({
		where: { id: brandId },
		select: { id: true, name: true, logo_url: true },
	});

	if (!existing) {
		throw new Error('Thương hiệu không tồn tại');
	}

	await prisma.brands.delete({
		where: { id: brandId },
	});

	if (existing.logo_url) {
		await deleteFromStorage(existing.logo_url).catch(() => undefined);
	}

	return { id: existing.id, name: existing.name };
};
