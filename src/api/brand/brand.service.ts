import { prisma } from '../../utils/prisma.js';
import { getStorageUrl } from '../../utils/storage.js';

export const GetBrands = async () => {
	const brands = await prisma.brands.findMany({
		select: {
			id: true,
			name: true,
			logo_url: true,
		},
		orderBy: { name: 'asc' },
	});

	return Promise.all(brands.map(async (brand) => ({
		...brand,
		logo_url: brand.logo_url ? await getStorageUrl(brand.logo_url) : null,
	})));
};

export const GetBrandDetail = async (brandId: number) => {
	const brand = await prisma.brands.findUnique({
		where: { id: brandId },
		select: {
			id: true,
			name: true,
			logo_url: true,
		},
	});

	if (!brand) {
		throw new Error('Thương hiệu không tồn tại');
	}

	return {
		...brand,
		logo_url: brand.logo_url ? await getStorageUrl(brand.logo_url) : null,
	};
};
