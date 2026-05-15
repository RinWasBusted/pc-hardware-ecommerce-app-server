import type { Request, Response } from 'express';
import { CreateBrand, DeleteBrand, UpdateBrand } from './brand.service.js';

export const CreateBrandController = async (req: Request, res: Response) => {
	try {
		const { name } = req.body;

		if (typeof name !== 'string' || !name.trim()) {
			return res.status(400).json({
				success: false,
				message: 'Trường name là bắt buộc',
			});
		}

		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: 'Trường logo là bắt buộc và phải là file ảnh',
			});
		}

		const brand = await CreateBrand(name.trim(), req.file);

		return res.status(201).json({
			success: true,
			data: brand,
			message: 'Tạo thương hiệu thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const UpdateBrandController = async (req: Request, res: Response) => {
	try {
		const brandId = parseInt(req.params.id as string, 10);
		const { name } = req.body;

		if (Number.isNaN(brandId)) {
			return res.status(400).json({
				success: false,
				message: 'ID thương hiệu không hợp lệ',
			});
		}

		if (typeof name !== 'string' || !name.trim()) {
			return res.status(400).json({
				success: false,
				message: 'Trường name là bắt buộc',
			});
		}

		const brand = await UpdateBrand(brandId, name.trim(), req.file);

		return res.status(200).json({
			success: true,
			data: brand,
			message: 'Cập nhật thương hiệu thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const DeleteBrandController = async (req: Request, res: Response) => {
	try {
		const brandId = parseInt(req.params.id as string, 10);

		if (Number.isNaN(brandId)) {
			return res.status(400).json({
				success: false,
				message: 'ID thương hiệu không hợp lệ',
			});
		}

		const deletedBrand = await DeleteBrand(brandId);

		return res.status(200).json({
			success: true,
			data: deletedBrand,
			message: 'Xóa thương hiệu thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
