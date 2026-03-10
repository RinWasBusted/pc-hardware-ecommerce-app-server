import { prisma } from '../../../utils/prisma.js';

type UpsertCategoryInput = {
	name: string;
	slug?: string;
	description?: string;
	parent_id?: number | null;
};

const toSlug = (value: string) => {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/g, 'd')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
};

const generateUniqueSlug = async (baseInput: string, excludeId?: number) => {
	const base = toSlug(baseInput) || `category-${Date.now()}`;
	let slug = base;
	let index = 1;

	while (true) {
		const existing = await prisma.categories.findFirst({
			where: {
				slug,
				...(excludeId ? { NOT: { id: excludeId } } : {}),
			},
			select: { id: true },
		});

		if (!existing) {
			return slug;
		}

		slug = `${base}-${index}`;
		index += 1;
	}
};

const validateParent = async (parentId?: number | null, currentCategoryId?: number) => {
	if (parentId == null) return;

	if (currentCategoryId && parentId === currentCategoryId) {
		throw new Error('Danh mục cha không hợp lệ');
	}

	const parentCategory = await prisma.categories.findUnique({
		where: { id: parentId },
		select: { id: true, parent_id: true },
	});

	if (!parentCategory) {
		throw new Error('Danh mục cha không tồn tại');
	}

	if (currentCategoryId) {
		let cursorParentId: number | null = parentCategory.parent_id;

		while (cursorParentId != null) {
			if (cursorParentId === currentCategoryId) {
				throw new Error('Không thể chọn danh mục con làm danh mục cha');
			}

			const parent = await prisma.categories.findUnique({
				where: { id: cursorParentId },
				select: { parent_id: true },
			});

			cursorParentId = parent?.parent_id ?? null;
		}
	}
};

export const CreateCategory = async (data: UpsertCategoryInput) => {
	await validateParent(data.parent_id);

	const slug = await generateUniqueSlug(data.slug || data.name);

	const category = await prisma.categories.create({
		data: {
			name: data.name,
			slug,
			description: data.description ?? null,
			parent_id: data.parent_id ?? null,
		},
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			parent_id: true,
			created_at: true,
		},
	});

	return category;
};

export const UpdateCategory = async (categoryId: number, data: UpsertCategoryInput) => {
	const existing = await prisma.categories.findUnique({
		where: { id: categoryId },
		select: { id: true },
	});

	if (!existing) {
		throw new Error('Danh mục không tồn tại');
	}

	await validateParent(data.parent_id, categoryId);

	const slug = await generateUniqueSlug(data.slug || data.name, categoryId);

	const category = await prisma.categories.update({
		where: { id: categoryId },
		data: {
			name: data.name,
			slug,
			description: data.description ?? null,
			parent_id: data.parent_id ?? null,
		},
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			parent_id: true,
			created_at: true,
		},
	});

	return category;
};

export const DeleteCategory = async (categoryId: number) => {
	const existing = await prisma.categories.findUnique({
		where: { id: categoryId },
		select: { id: true, name: true },
	});

	if (!existing) {
		throw new Error('Danh mục không tồn tại');
	}

	await prisma.categories.delete({
		where: { id: categoryId },
	});

	return { id: existing.id, name: existing.name };
};
