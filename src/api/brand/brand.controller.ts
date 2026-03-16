import type { Request, Response } from 'express';
import { GetBrandDetail, GetBrands } from './brand.service.js';

export const GetBrandsController = async (_req: Request, res: Response) => {
	try {
		const brands = await GetBrands();

		return res.status(200).json({
			success: true,
			data: brands,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const GetBrandDetailController = async (req: Request, res: Response) => {
	try {
		const brandId = parseInt(req.params.id as string, 10);

		if (Number.isNaN(brandId)) {
			return res.status(400).json({
				success: false,
				message: 'ID thương hiệu không hợp lệ',
			});
		}

		const brand = await GetBrandDetail(brandId);

		return res.status(200).json({
			success: true,
			data: brand,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
