import type { Request, Response } from 'express';
import { GetUsers, GetUserDetail, UpdateUserStatus } from './admin.service.js';

export const GetUsersController = async (req: Request, res: Response) => {
	try {
		const { role, is_active, search } = req.query;

		const filters: { role?: string; is_active?: boolean; search?: string } = {};

		if (typeof role === 'string') {
			filters.role = role;
		}

		if (typeof is_active === 'string') {
			if (is_active === 'true') {
				filters.is_active = true;
			} else if (is_active === 'false') {
				filters.is_active = false;
			}
		}

		if (typeof search === 'string') {
			filters.search = search;
		}

		const users = await GetUsers(filters);

		return res.status(200).json({
			success: true,
			data: users,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

export const GetUserDetailController = async (req: Request, res: Response) => {
	try {
		const userId = parseInt(req.params.id as string);

		if (Number.isNaN(userId)) {
			return res.status(400).json({
				success: false,
				error: 'ID người dùng không hợp lệ',
			});
		}

		const user = await GetUserDetail(userId);

		return res.status(200).json({
			success: true,
			data: user,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

export const UpdateUserStatusController = async (req: Request, res: Response) => {
	try {
		const userId = parseInt(req.params.id as string);
		const { is_active } = req.body;

		if (Number.isNaN(userId)) {
			return res.status(400).json({
				success: false,
				error: 'ID người dùng không hợp lệ',
			});
		}

		if (typeof is_active !== 'boolean') {
			return res.status(400).json({
				success: false,
				error: 'Trường is_active là bắt buộc và phải là boolean',
			});
		}

		const updatedUser = await UpdateUserStatus(userId, is_active);

		return res.status(200).json({
			success: true,
			data: updatedUser,
			message: is_active ? 'Mở khóa tài khoản thành công' : 'Khóa tài khoản thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

