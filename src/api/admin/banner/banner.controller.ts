import type { Request, Response } from 'express';
import { CreateBanner, DeleteBanner, GetBanners, UpdateBanner } from './banner.service.js';

export const GetBannersController = async (req: Request, res: Response) => {
	try {
		const sortRaw = typeof req.query.sort === 'string' ? req.query.sort.toLowerCase() : 'asc';
		const isActiveRaw = req.query.is_active;

		if (sortRaw !== 'asc' && sortRaw !== 'desc') {
			return res.status(400).json({
				success: false,
				message: 'Trường sort chỉ chấp nhận asc hoặc desc',
			});
		}

		let parsedIsActive: boolean | undefined;
		if (isActiveRaw !== undefined) {
			if (typeof isActiveRaw !== 'string') {
				return res.status(400).json({
					success: false,
					message: 'Trường is_active không hợp lệ',
				});
			}

			if (isActiveRaw === 'true') {
				parsedIsActive = true;
			} else if (isActiveRaw === 'false') {
				parsedIsActive = false;
			} else {
				return res.status(400).json({
					success: false,
					message: 'Trường is_active không hợp lệ',
				});
			}
		}

		const banners = await GetBanners({
			sort: sortRaw,
			...(parsedIsActive !== undefined && { isActive: parsedIsActive }),
		});

		return res.status(200).json({
			success: true,
			data: banners,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const CreateBannerController = async (req: Request, res: Response) => {
	try {
		const { link_url, is_active } = req.body;

		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'Trường image là bắt buộc và phải là file ảnh',
			});
		}

		if (link_url !== undefined && typeof link_url !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Trường link_url không hợp lệ',
			});
		}

		let parsedIsActive = true;
		if (is_active !== undefined) {
			if (is_active === true || is_active === 'true') {
				parsedIsActive = true;
			} else if (is_active === false || is_active === 'false') {
				parsedIsActive = false;
			} else {
				return res.status(400).json({
					success: false,
					message: 'Trường is_active không hợp lệ',
				});
			}
		}

		const banner = await CreateBanner(
			req.file,
			typeof link_url === 'string' && link_url.trim() ? link_url.trim() : undefined,
			parsedIsActive
		);

		return res.status(201).json({
			success: true,
			data: banner,
			message: 'Tạo banner thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const UpdateBannerController = async (req: Request, res: Response) => {
	try {
		const bannerId = parseInt(req.params.id as string, 10);
		const { link_url, sort_order, is_active } = req.body;

		if (Number.isNaN(bannerId)) {
			return res.status(400).json({
				success: false,
				message: 'ID banner không hợp lệ',
			});
		}

		if (link_url !== undefined && typeof link_url !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Trường link_url không hợp lệ',
			});
		}

		let parsedSortOrder: number | undefined;
		if (sort_order !== undefined) {
			parsedSortOrder = Number(sort_order);
			if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 1) {
				return res.status(400).json({
					success: false,
					message: 'Trường sort_order phải là số nguyên lớn hơn 0',
				});
			}
		}

		let parsedIsActive: boolean | undefined;
		if (is_active !== undefined) {
			if (is_active === true || is_active === 'true') {
				parsedIsActive = true;
			} else if (is_active === false || is_active === 'false') {
				parsedIsActive = false;
			} else {
				return res.status(400).json({
					success: false,
					message: 'Trường is_active không hợp lệ',
				});
			}
		}

		const banner = await UpdateBanner(bannerId, {
			...(req.file && { imageFile: req.file }),
			...(link_url !== undefined && {
				linkUrl: link_url.trim() ? link_url.trim() : null,
			}),
			...(parsedSortOrder !== undefined && { sortOrder: parsedSortOrder }),
			...(parsedIsActive !== undefined && { isActive: parsedIsActive }),
		});

		return res.status(200).json({
			success: true,
			data: banner,
			message: 'Cập nhật banner thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const DeleteBannerController = async (req: Request, res: Response) => {
	try {
		const bannerId = parseInt(req.params.id as string, 10);

		if (Number.isNaN(bannerId)) {
			return res.status(400).json({
				success: false,
				message: 'ID banner không hợp lệ',
			});
		}

		const deletedBanner = await DeleteBanner(bannerId);

		return res.status(200).json({
			success: true,
			data: deletedBanner,
			message: 'Xóa banner thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
