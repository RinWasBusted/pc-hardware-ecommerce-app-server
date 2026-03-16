import type { Request, Response } from 'express';
import { CreateCategory, DeleteCategory, UpdateCategory } from './category.service.js';

const parseParentId = (value: unknown): number | null | undefined => {
	if (value === undefined) return undefined;
	if (value === null) return null;

	if (typeof value === 'number') {
		if (Number.isInteger(value)) return value;
		return undefined;
	}

	if (typeof value === 'string') {
		if (value.trim() === '' || value.trim().toLowerCase() === 'null') return null;
		const parsed = parseInt(value, 10);
		if (!Number.isNaN(parsed)) return parsed;
	}

	return undefined;
};

export const CreateCategoryController = async (req: Request, res: Response) => {
	try {
		const { name, slug, description, parent_id } = req.body;

		if (typeof name !== 'string' || !name.trim()) {
			return res.status(400).json({
				success: false,
				message: 'Trường name là bắt buộc',
			});
		}

		const parsedParentId = parseParentId(parent_id);
		if (parent_id !== undefined && parsedParentId === undefined) {
			return res.status(400).json({
				success: false,
				message: 'Trường parent_id không hợp lệ',
			});
		}

		const payload: {
			name: string;
			slug?: string;
			description?: string;
			parent_id?: number | null;
		} = {
			name: name.trim(),
		};

		if (typeof slug === 'string') payload.slug = slug;
		if (typeof description === 'string') payload.description = description;
		if (parent_id !== undefined && parsedParentId !== undefined) payload.parent_id = parsedParentId;

		const category = await CreateCategory(payload);

		return res.status(201).json({
			success: true,
			data: category,
			message: 'Tạo danh mục thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const UpdateCategoryController = async (req: Request, res: Response) => {
	try {
		const categoryId = parseInt(req.params.id as string, 10);
		const { name, slug, description, parent_id } = req.body;

		if (Number.isNaN(categoryId)) {
			return res.status(400).json({
				success: false,
				message: 'ID danh mục không hợp lệ',
			});
		}

		if (typeof name !== 'string' || !name.trim()) {
			return res.status(400).json({
				success: false,
				message: 'Trường name là bắt buộc',
			});
		}

		const parsedParentId = parseParentId(parent_id);
		if (parent_id !== undefined && parsedParentId === undefined) {
			return res.status(400).json({
				success: false,
				message: 'Trường parent_id không hợp lệ',
			});
		}

		const payload: {
			name: string;
			slug?: string;
			description?: string;
			parent_id?: number | null;
		} = {
			name: name.trim(),
		};

		if (typeof slug === 'string') payload.slug = slug;
		if (typeof description === 'string') payload.description = description;
		if (parent_id !== undefined && parsedParentId !== undefined) payload.parent_id = parsedParentId;

		const category = await UpdateCategory(categoryId, payload);

		return res.status(200).json({
			success: true,
			data: category,
			message: 'Cập nhật danh mục thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const DeleteCategoryController = async (req: Request, res: Response) => {
	try {
		const categoryId = parseInt(req.params.id as string, 10);

		if (Number.isNaN(categoryId)) {
			return res.status(400).json({
				success: false,
				message: 'ID danh mục không hợp lệ',
			});
		}

		const deletedCategory = await DeleteCategory(categoryId);

		return res.status(200).json({
			success: true,
			data: deletedCategory,
			message: 'Xóa danh mục thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
