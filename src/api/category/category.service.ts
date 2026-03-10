import { prisma } from '../../utils/prisma.js';

type CategoryNode = {
	id: number;
	name: string;
	slug: string;
	description: string | null;
	parent_id: number | null;
	children: CategoryNode[];
};

const buildCategoryTree = (
	categories: Array<{
		id: number;
		name: string;
		slug: string;
		description: string | null;
		parent_id: number | null;
	}>,
) => {
	const map = new Map<number, CategoryNode>();

	for (const category of categories) {
		map.set(category.id, {
			...category,
			children: [],
		});
	}

	const roots: CategoryNode[] = [];

	for (const category of categories) {
		const node = map.get(category.id)!;

		if (category.parent_id && map.has(category.parent_id)) {
			map.get(category.parent_id)!.children.push(node);
		} else {
			roots.push(node);
		}
	}

	return { roots, map };
};

export const GetCategoriesTree = async () => {
	const categories = await prisma.categories.findMany({
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			parent_id: true,
		},
		orderBy: [{ parent_id: 'asc' }, { name: 'asc' }],
	});

	const { roots } = buildCategoryTree(categories);
	return roots;
};

export const GetCategoryDetail = async (categoryId: number) => {
	const categories = await prisma.categories.findMany({
		select: {
			id: true,
			name: true,
			slug: true,
			description: true,
			parent_id: true,
			created_at: true,
		},
		orderBy: [{ parent_id: 'asc' }, { name: 'asc' }],
	});

	const { map } = buildCategoryTree(categories);
	const category = map.get(categoryId);

	if (!category) {
		throw new Error('Danh mục không tồn tại');
	}

	return category;
};
