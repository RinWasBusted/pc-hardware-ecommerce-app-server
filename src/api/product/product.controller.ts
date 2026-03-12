import type { Request, Response } from 'express';
import { GetProductDetailBySlug, GetProducts, GetProductsByCategory } from './product.service.js';

export const GetProductsController = async (req: Request, res: Response) => {
	try {
		const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
		const limitInput = parseInt(req.query.limit as string, 10) || 20;
		const limit = Math.min(Math.max(limitInput, 1), 50);

		const keywordRaw = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
		const keyword = keywordRaw.length > 0 ? keywordRaw : undefined;

		const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined;
		const brandId = req.query.brand_id ? Number(req.query.brand_id) : undefined;
		const priceMin = req.query.price_min ? Number(req.query.price_min) : undefined;
		const priceMax = req.query.price_max ? Number(req.query.price_max) : undefined;
		const sort = req.query.sort === 'oldest' ? 'oldest' : 'newest';

		if ((categoryId !== undefined && Number.isNaN(categoryId))
			|| (brandId !== undefined && Number.isNaN(brandId))
			|| (priceMin !== undefined && Number.isNaN(priceMin))
			|| (priceMax !== undefined && Number.isNaN(priceMax))) {
			return res.status(400).json({
				success: false,
				error: 'Tham số lọc không hợp lệ',
			});
		}

		if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
			return res.status(400).json({
				success: false,
				error: 'Khoảng giá không hợp lệ',
			});
		}

		const result = await GetProducts({
			page,
			limit,
			...(keyword && { keyword }),
            ...(categoryId && { categoryId: Number(categoryId) }),
            ...(brandId && { brandId: Number(brandId) }),
            ...(priceMin && { priceMin: Number(priceMin) }),
            ...(priceMax && { priceMax: Number(priceMax) }),
			sort,
		});

		return res.status(200).json({
			success: true,
			data: result.items,
			pagination: result.pagination,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

export const GetProductDetailController = async (req: Request, res: Response) => {
	try {
		const { slug } = req.params;

		if (!slug || typeof slug !== 'string') {
			return res.status(400).json({
				success: false,
				error: 'Slug không hợp lệ',
			});
		}

		const product = await GetProductDetailBySlug(slug);

		return res.status(200).json({
			success: true,
			data: product,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

export const GetProductsByCategoryController = async (req: Request, res: Response) => {
	try {
		const categoryId = parseInt(req.params.category_id as string, 10);
		const limitInput = parseInt(req.query.limit as string, 10) || 8;
		const limit = Math.min(Math.max(limitInput, 1), 50);

		if (Number.isNaN(categoryId)) {
			return res.status(400).json({
				success: false,
				error: 'ID danh mục không hợp lệ',
			});
		}

		const products = await GetProductsByCategory(categoryId, limit);

		return res.status(200).json({
			success: true,
			data: products,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};
