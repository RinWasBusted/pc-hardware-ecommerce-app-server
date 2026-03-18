import type { Request, Response } from 'express';
import * as couponService from '../admin/coupon/coupon.service.js';

export const ListCouponsController = async (req: Request, res: Response) => {
	try {
		const coupons = await couponService.ListCoupons(true);

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