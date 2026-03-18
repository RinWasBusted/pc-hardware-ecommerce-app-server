import type { Request, Response } from 'express';
import { DiscountType } from '@prisma/client';
import * as couponService from './coupon.service.js';

export const ListCouponsController = async (req: Request, res: Response) => {
	try {
		const isActiveRaw = req.query.is_active as string | undefined;
		const isActive = isActiveRaw ? isActiveRaw.toLowerCase() === 'true' : undefined;

		const coupons = await couponService.ListCoupons(isActive);

		return res.status(200).json({
			success: true,
			data: coupons,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const GetCouponController = async (req: Request, res: Response) => {
	try {
		const couponId = parseInt(req.params.id as string, 10);

		if (Number.isNaN(couponId)) {
			return res.status(400).json({
				success: false,
				message: 'ID coupon không hợp lệ',
			});
		}

		const coupon = await couponService.GetCoupon(couponId);

		return res.status(200).json({
			success: true,
			data: coupon,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const CreateCouponController = async (req: Request, res: Response) => {
	try {
		const { code, discount_type, discount_value, min_order_value, max_uses, expires_at, is_active } = req.body;

		if (typeof code !== 'string' || !code.trim()) {
			return res.status(400).json({
				success: false,
				message: 'Trường code là bắt buộc',
			});
		}

		if (typeof discount_type !== 'string' || !['percent', 'fixed'].includes(discount_type)) {
			return res.status(400).json({
				success: false,
				message: 'discount_type phải là "percent" hoặc "fixed"',
			});
		}

		const parsedDiscountValue = Number(discount_value);
		if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
			return res.status(400).json({
				success: false,
				message: 'discount_value phải là số dương',
			});
		}

		if (discount_type === 'percent' && parsedDiscountValue > 100) {
			return res.status(400).json({
				success: false,
				message: 'discount_value (%) không được vượt quá 100',
			});
		}

		const parsedMinOrderValue = min_order_value !== undefined ? Number(min_order_value) : undefined;
		if (parsedMinOrderValue !== undefined && (Number.isNaN(parsedMinOrderValue) || parsedMinOrderValue < 0)) {
			return res.status(400).json({
				success: false,
				message: 'min_order_value phải là số không âm',
			});
		}

		const parsedMaxUses = max_uses !== undefined ? Number(max_uses) : undefined;
		if (parsedMaxUses !== undefined && (Number.isNaN(parsedMaxUses) || !Number.isInteger(parsedMaxUses) || parsedMaxUses < 1)) {
			return res.status(400).json({
				success: false,
				message: 'max_uses phải là số nguyên dương',
			});
		}

		let parsedExpiresAt: Date | undefined = undefined;
		if (expires_at !== undefined) {
			parsedExpiresAt = new Date(expires_at);
			if (Number.isNaN(parsedExpiresAt.getTime())) {
				return res.status(400).json({
					success: false,
					message: 'expires_at phải là ISO 8601 timestamp hợp lệ',
				});
			}
		}

		const payload: Parameters<typeof couponService.CreateCoupon>[0] = {
			code: code.trim().toUpperCase(),
			discount_type: discount_type as DiscountType,
			discount_value: parsedDiscountValue,
			...(parsedMinOrderValue !== undefined && { min_order_value: parsedMinOrderValue }),
			...(parsedMaxUses !== undefined && { max_uses: parsedMaxUses }),
			...(parsedExpiresAt && { expires_at: parsedExpiresAt }),
			...(typeof is_active === 'boolean' && { is_active }),
		};

		const coupon = await couponService.CreateCoupon(payload);

		return res.status(201).json({
			success: true,
			data: coupon,
			message: 'Tạo coupon thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const UpdateCouponController = async (req: Request, res: Response) => {
	try {
		const couponId = parseInt(req.params.id as string, 10);
		const { code, discount_type, discount_value, min_order_value, max_uses, expires_at, is_active } = req.body;

		if (Number.isNaN(couponId)) {
			return res.status(400).json({
				success: false,
				message: 'ID coupon không hợp lệ',
			});
		}

		const payload: Partial<Parameters<typeof couponService.UpdateCoupon>[1]> & { min_order_value?: number | null; max_uses?: number | null } = {};

		if (code !== undefined) {
			if (typeof code !== 'string' || !code.trim()) {
				return res.status(400).json({
					success: false,
					message: 'Trường code không hợp lệ',
				});
			}
			payload.code = code.trim().toUpperCase();
		}

		if (discount_type !== undefined) {
			if (!['percent', 'fixed'].includes(discount_type)) {
				return res.status(400).json({
					success: false,
					message: 'discount_type phải là "percent" hoặc "fixed"',
				});
			}
			payload.discount_type = discount_type as DiscountType;
		}

		if (discount_value !== undefined) {
			const parsedDiscountValue = Number(discount_value);
			if (Number.isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
				return res.status(400).json({
					success: false,
					message: 'discount_value phải là số dương',
				});
			}

			const checkDiscountType = discount_type || 'percent';
			if (checkDiscountType === 'percent' && parsedDiscountValue > 100) {
				return res.status(400).json({
					success: false,
					message: 'discount_value (%) không được vượt quá 100',
				});
			}

			payload.discount_value = parsedDiscountValue;
		}

		if (min_order_value !== undefined) {
			if (min_order_value === null) {
				payload.min_order_value = null;
			} else {
				const parsedMinOrderValue = Number(min_order_value);
				if (Number.isNaN(parsedMinOrderValue) || parsedMinOrderValue < 0) {
					return res.status(400).json({
						success: false,
						message: 'min_order_value phải là số không âm',
					});
				}
				payload.min_order_value = parsedMinOrderValue;
			}
		} else {
			payload.min_order_value = null;
		}

		if (max_uses !== undefined) {
			if (max_uses === null) {
				payload.max_uses = null;
			} else {
				const parsedMaxUses = Number(max_uses);
				if (Number.isNaN(parsedMaxUses) || !Number.isInteger(parsedMaxUses) || parsedMaxUses < 1) {
					return res.status(400).json({
						success: false,
						message: 'max_uses phải là số nguyên dương',
					});
				}
				payload.max_uses = parsedMaxUses;
			}
		} else {
			payload.max_uses = null;
		}

		if (expires_at !== undefined) {
			const parsedExpiresAt = new Date(expires_at);
			if (Number.isNaN(parsedExpiresAt.getTime())) {
				return res.status(400).json({
					success: false,
					message: 'expires_at phải là ISO 8601 timestamp hợp lệ',
				});
			}
			payload.expires_at = parsedExpiresAt;
		}

		if (typeof is_active === 'boolean') {
			payload.is_active = is_active;
		}

		if (Object.keys(payload).length === 0) {
			return res.status(400).json({
				success: false,
				message: 'Không có dữ liệu để cập nhật',
			});
		}

		const coupon = await couponService.UpdateCoupon(couponId, payload);

		return res.status(200).json({
			success: true,
			data: coupon,
			message: 'Cập nhật coupon thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const DeleteCouponController = async (req: Request, res: Response) => {
	try {
		const couponId = parseInt(req.params.id as string, 10);

		if (Number.isNaN(couponId)) {
			return res.status(400).json({
				success: false,
				message: 'ID coupon không hợp lệ',
			});
		}

		const deletedCoupon = await couponService.DeleteCoupon(couponId);

		return res.status(200).json({
			success: true,
			data: deletedCoupon,
			message: 'Xóa coupon thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const ToggleCouponStatusController = async (req: Request, res: Response) => {
	try {
		const couponId = parseInt(req.params.id as string, 10);

		if (Number.isNaN(couponId)) {
			return res.status(400).json({
				success: false,
				message: 'ID coupon không hợp lệ',
			});
		}

		const coupon = await couponService.ToggleCouponStatus(couponId);

		return res.status(200).json({
			success: true,
			data: coupon,
			message: `Coupon ${coupon.is_active ? 'được kích hoạt' : 'được vô hiệu hóa'} thành công`,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
