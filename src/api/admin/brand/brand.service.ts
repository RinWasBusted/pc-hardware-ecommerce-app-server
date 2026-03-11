import { prisma } from '../../../utils/prisma.js';
import { deleteImageFromCloudinary } from '../../../utils/cloudinary.js';

type UpsertBrandInput = {
	name: string;
	logo_url?: string;
};

export const CreateBrand = async (data: UpsertBrandInput) => {
	const existing = await prisma.brands.findUnique({
		where: { name: data.name },
		select: { id: true },
	});

	if (existing) {
		throw new Error('Tên thương hiệu đã tồn tại');
	}

	const brand = await prisma.brands.create({
		data: {
			name: data.name,
			logo_url: data.logo_url ?? null,
		},
		select: {
			id: true,
			name: true,
			logo_url: true,
		},
	});

	return brand;
};

export const UpdateBrand = async (brandId: number, data: UpsertBrandInput) => {
	const existing = await prisma.brands.findUnique({
		where: { id: brandId },
		select: { id: true, logo_url: true },
	});

	if (!existing) {
		throw new Error('Thương hiệu không tồn tại');
	}

	const duplicate = await prisma.brands.findFirst({
		where: { name: data.name, NOT: { id: brandId } },
		select: { id: true },
	});

	if (duplicate) {
		throw new Error('Tên thương hiệu đã tồn tại');
	}

	if (typeof data.logo_url === 'string' && existing.logo_url && existing.logo_url !== data.logo_url) {
		await deleteImageFromCloudinary(existing.logo_url);
	}

	const brand = await prisma.brands.update({
		where: { id: brandId },
		data: {
			name: data.name,
			...(typeof data.logo_url === 'string' ? { logo_url: data.logo_url } : {}),
		},
		select: {
			id: true,
			name: true,
			logo_url: true,
		},
	});

	return brand;
};

export const DeleteBrand = async (brandId: number) => {
	const existing = await prisma.brands.findUnique({
		where: { id: brandId },
		select: { id: true, name: true, logo_url: true },
	});

	if (!existing) {
		throw new Error('Thương hiệu không tồn tại');
	}

	if (existing.logo_url) {
		await deleteImageFromCloudinary(existing.logo_url);
	}

	await prisma.brands.delete({
		where: { id: brandId },
	});

	return { id: existing.id, name: existing.name };
};
