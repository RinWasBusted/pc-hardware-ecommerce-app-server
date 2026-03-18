import { prisma } from '../../../utils/prisma.js';
import type { DiscountType } from '@prisma/client';

type UpsertCouponInput = {
	code: string;
	discount_type: DiscountType;
	discount_value: number;
	min_order_value?: number | null;
	max_uses?: number | null;
	expires_at?: Date;
	is_active?: boolean;
};

export const ListCoupons = async (isActive?: boolean) => {
	const coupons = await prisma.coupons.findMany({
		where: {
			...(isActive !== undefined && { is_active: isActive }),
		},
		select: {
			id: true,
			code: true,
			discount_type: true,
			discount_value: true,
			min_order_value: true,
			max_uses: true,
			used_count: true,
			expires_at: true,
			is_active: true,
			created_at: true,
		},
		orderBy: {
			created_at: 'desc',
		},
	});

	return coupons;
};

export const GetCoupon = async (couponId: number) => {
	const coupon = await prisma.coupons.findUnique({
		where: { id: couponId },
		select: {
			id: true,
			code: true,
			discount_type: true,
			discount_value: true,
			min_order_value: true,
			max_uses: true,
			used_count: true,
			expires_at: true,
			is_active: true,
			created_at: true,
		},
	});

	if (!coupon) {
		throw new Error('Coupon không tồn tại');
	}

	return coupon;
};

export const CreateCoupon = async (data: UpsertCouponInput) => {
	const existing = await prisma.coupons.findUnique({
		where: { code: data.code },
		select: { id: true },
	});

	if (existing) {
		throw new Error('Mã coupon đã tồn tại');
	}

	const coupon = await prisma.coupons.create({
		data: {
			code: data.code,
			discount_type: data.discount_type,
			discount_value: data.discount_value,
			min_order_value: data.min_order_value ?? null,
			max_uses: data.max_uses ?? null,
			expires_at: data.expires_at ?? null,
			is_active: data.is_active ?? true,
		},
		select: {
			id: true,
			code: true,
			discount_type: true,
			discount_value: true,
			min_order_value: true,
			max_uses: true,
			used_count: true,
			expires_at: true,
			is_active: true,
			created_at: true,
		},
	});

	return coupon;
};

export const UpdateCoupon = async (couponId: number, data: Partial<UpsertCouponInput>) => {
	const existing = await prisma.coupons.findUnique({
		where: { id: couponId },
		select: { id: true, code: true },
	});

	if (!existing) {
		throw new Error('Coupon không tồn tại');
	}

	if (data.code && data.code !== existing.code) {
		const duplicate = await prisma.coupons.findUnique({
			where: { code: data.code },
			select: { id: true },
		});

		if (duplicate) {
			throw new Error('Mã coupon đã tồn tại');
		}
	}

	const coupon = await prisma.coupons.update({
		where: { id: couponId },
		data: {
			...(data.code && { code: data.code }),
			...(data.discount_type && { discount_type: data.discount_type }),
			...(data.discount_value !== undefined && { discount_value: data.discount_value }),
			...(data.min_order_value !== undefined && { min_order_value: data.min_order_value }),
			...(data.max_uses !== undefined && { max_uses: data.max_uses }),
			...(data.expires_at && { expires_at: data.expires_at }),
			...(data.is_active !== undefined && { is_active: data.is_active }),
		},
		select: {
			id: true,
			code: true,
			discount_type: true,
			discount_value: true,
			min_order_value: true,
			max_uses: true,
			used_count: true,
			expires_at: true,
			is_active: true,
			created_at: true,
		},
	});

	return coupon;
};

export const DeleteCoupon = async (couponId: number) => {
	const existing = await prisma.coupons.findUnique({
		where: { id: couponId },
		select: { id: true, code: true },
	});

	if (!existing) {
		throw new Error('Coupon không tồn tại');
	}

	await prisma.coupons.delete({
		where: { id: couponId },
	});

	return { id: existing.id, code: existing.code };
};

export const ToggleCouponStatus = async (couponId: number) => {
	const existing = await prisma.coupons.findUnique({
		where: { id: couponId },
		select: { id: true, is_active: true },
	});

	if (!existing) {
		throw new Error('Coupon không tồn tại');
	}

	const coupon = await prisma.coupons.update({
		where: { id: couponId },
		data: {
			is_active: !existing.is_active,
		},
		select: {
			id: true,
			code: true,
			discount_type: true,
			discount_value: true,
			min_order_value: true,
			max_uses: true,
			used_count: true,
			expires_at: true,
			is_active: true,
			created_at: true,
		},
	});

	return coupon;
};
