import { prisma } from '../../utils/prisma.js';
import { getCloudinaryImageUrl } from '../../utils/cloudinary.js';

export const GetBrands = async () => {
	const brands = await prisma.brands.findMany({
		select: {
			id: true,
			name: true,
			logo_url: true,
		},
		orderBy: { name: 'asc' },
	});

	return brands.map((brand) => ({
		...brand,
		logo_url: brand.logo_url ? getCloudinaryImageUrl(brand.logo_url) : null,
	}));
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
		logo_url: brand.logo_url ? getCloudinaryImageUrl(brand.logo_url) : null,
	};
};
