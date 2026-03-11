import { prisma } from '../../../utils/prisma.js';

export const GetUsers = async (filters: {
	role?: string;
	is_active?: boolean;
	search?: string;
}) => {
	const where: any = {};

	if (filters.role) {
		where.role = filters.role;
	}

	if (typeof filters.is_active === 'boolean') {
		where.is_active = filters.is_active;
	}

	if (filters.search) {
		where.OR = [
			{ full_name: { contains: filters.search, mode: 'insensitive' } },
			{ email: { contains: filters.search, mode: 'insensitive' } },
			{ phone_number: { contains: filters.search, mode: 'insensitive' } },
		];
	}

	const users = await prisma.user.findMany({
		where,
		select: {
			id: true,
			full_name: true,
			email: true,
			phone_number: true,
			avatar_url: true,
			role: true,
			is_verified: true,
			is_active: true,
			created_at: true,
			updated_at: true,
		},
		orderBy: { created_at: 'desc' },
	});

	return users;
};

export const GetUserDetail = async (userId: number) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			full_name: true,
			email: true,
			phone_number: true,
			avatar_url: true,
			role: true,
			setting: true,
			is_verified: true,
			is_active: true,
			created_at: true,
			updated_at: true,
			addresses: {
				select: {
					id: true,
					recipient: true,
					phone_number: true,
					province: true,
					district: true,
					ward: true,
					street: true,
					is_default: true,
					created_at: true,
				},
			},
		},
	});

	if (!user) {
		throw new Error('Người dùng không tồn tại');
	}

	return user;
};

export const UpdateUserStatus = async (userId: number, isActive: boolean) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});

	if (!user) {
		throw new Error('Người dùng không tồn tại');
	}

	const updatedUser = await prisma.user.update({
		where: { id: userId },
		data: { is_active: isActive },
		select: {
			id: true,
			full_name: true,
			email: true,
			role: true,
			is_active: true,
			updated_at: true,
		},
	});

	return updatedUser;
};
