import type { Request, Response } from 'express';
import { getCloudinaryImageUrl, uploadImageToCloudinary } from '../../../utils/cloudinary.js';
import { CreateBrand, DeleteBrand, UpdateBrand } from './brand.service.js';

export const CreateBrandController = async (req: Request, res: Response) => {
	try {
		const { name } = req.body;

		if (typeof name !== 'string' || !name.trim()) {
			return res.status(400).json({
				success: false,
				error: 'Trường name là bắt buộc',
			});
		}

		if (!req.file) {
			return res.status(400).json({
				success: false,
				error: 'Trường logo là bắt buộc và phải là file ảnh',
			});
		}

		const uploadResult = await uploadImageToCloudinary(
			req.file.buffer,
			req.file.originalname,
			'pc-hardware-ecommerce/brands',
		);

		const brand = await CreateBrand({
			name: name.trim(),
			logo_url: uploadResult.public_id,
		});

		return res.status(201).json({
			success: true,
			data: {
				...brand,
				logo_url: brand.logo_url ? getCloudinaryImageUrl(brand.logo_url) : null,
			},
			message: 'Tạo thương hiệu thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
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
				error: 'ID thương hiệu không hợp lệ',
			});
		}

		if (typeof name !== 'string' || !name.trim()) {
			return res.status(400).json({
				success: false,
				error: 'Trường name là bắt buộc',
			});
		}

		const updatePayload: { name: string; logo_url?: string } = {
			name: name.trim(),
		};

		if (req.file) {
			const uploadResult = await uploadImageToCloudinary(
				req.file.buffer,
				req.file.originalname,
				'pc-hardware-ecommerce/brands',
			);
			updatePayload.logo_url = uploadResult.public_id;
		}

		const brand = await UpdateBrand(brandId, updatePayload);

		return res.status(200).json({
			success: true,
			data: {
				...brand,
				logo_url: brand.logo_url ? getCloudinaryImageUrl(brand.logo_url) : null,
			},
			message: 'Cập nhật thương hiệu thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

export const DeleteBrandController = async (req: Request, res: Response) => {
	try {
		const brandId = parseInt(req.params.id as string, 10);

		if (Number.isNaN(brandId)) {
			return res.status(400).json({
				success: false,
				error: 'ID thương hiệu không hợp lệ',
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
			error: error.message,
		});
	}
};
