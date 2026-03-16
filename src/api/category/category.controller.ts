import type { Request, Response } from 'express';
import { GetCategoriesTree, GetCategoryDetail } from './category.service.js';

export const GetCategoriesController = async (_req: Request, res: Response) => {
	try {
		const categories = await GetCategoriesTree();

		return res.status(200).json({
			success: true,
			data: categories,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const GetCategoryDetailController = async (req: Request, res: Response) => {
	try {
		const categoryId = parseInt(req.params.id as string);

		if (Number.isNaN(categoryId)) {
			return res.status(400).json({
				success: false,
				message: 'ID danh mục không hợp lệ',
			});
		}

		const category = await GetCategoryDetail(categoryId);

		return res.status(200).json({
			success: true,
			data: category,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
