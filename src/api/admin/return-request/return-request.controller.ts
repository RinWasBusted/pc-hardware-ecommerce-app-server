import type { Request, Response } from 'express';
import {
	ApproveAdminReturnRequest,
	CompleteAdminReturnRequest,
	GetAdminReturnRequestDetail,
	GetAdminReturnRequests,
	MarkAdminReturnRequestReceived,
	RejectAdminReturnRequest,
} from './return-request.service.js';

const RETURN_STATUSES = new Set(['pending', 'approved', 'rejected', 'received', 'completed']);

export const GetAdminReturnRequestsController = async (req: Request, res: Response) => {
	try {
		const filters: { status?: string } = {};

		if (typeof req.query.status === 'string' && req.query.status.trim() !== '') {
			const status = req.query.status.trim();
			if (!RETURN_STATUSES.has(status)) {
				return res.status(400).json({
					success: false,
					message: 'status không hợp lệ',
				});
			}
			filters.status = status;
		}

		const requests = await GetAdminReturnRequests(filters);

		return res.status(200).json({
			success: true,
			data: requests,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const GetAdminReturnRequestDetailController = async (req: Request, res: Response) => {
	try {
		const requestId = Number(req.params.id);

		if (Number.isNaN(requestId) || requestId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'return_request_id không hợp lệ',
			});
		}

		const request = await GetAdminReturnRequestDetail(requestId);

		return res.status(200).json({
			success: true,
			data: request,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const ApproveAdminReturnRequestController = async (req: Request, res: Response) => {
	try {
		const adminId = Number(res.locals.userId);
		const requestId = Number(req.params.id);
		const refundAmountRaw = req.body.refund_amount;
		const refundAmount = Number(refundAmountRaw);
		const adminNote = typeof req.body.admin_note === 'string' ? req.body.admin_note.trim() : undefined;

		if (Number.isNaN(adminId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(requestId) || requestId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'return_request_id không hợp lệ',
			});
		}

		if (refundAmountRaw === undefined || refundAmountRaw === null || refundAmountRaw === '' || Number.isNaN(refundAmount)) {
			return res.status(400).json({
				success: false,
				message: 'refund_amount là bắt buộc',
			});
		}

		const updated = await ApproveAdminReturnRequest(requestId, adminId, refundAmount, adminNote);

		return res.status(200).json({
			success: true,
			data: updated,
			message: 'Duyệt yêu cầu trả hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const RejectAdminReturnRequestController = async (req: Request, res: Response) => {
	try {
		const adminId = Number(res.locals.userId);
		const requestId = Number(req.params.id);
		const adminNote = typeof req.body.admin_note === 'string' ? req.body.admin_note.trim() : '';

		if (Number.isNaN(adminId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(requestId) || requestId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'return_request_id không hợp lệ',
			});
		}

		if (!adminNote) {
			return res.status(400).json({
				success: false,
				message: 'admin_note là bắt buộc',
			});
		}

		const updated = await RejectAdminReturnRequest(requestId, adminId, adminNote);

		return res.status(200).json({
			success: true,
			data: updated,
			message: 'Từ chối yêu cầu trả hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const MarkAdminReturnRequestReceivedController = async (req: Request, res: Response) => {
	try {
		const adminId = Number(res.locals.userId);
		const requestId = Number(req.params.id);

		if (Number.isNaN(adminId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(requestId) || requestId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'return_request_id không hợp lệ',
			});
		}

		const updated = await MarkAdminReturnRequestReceived(requestId, adminId);

		return res.status(200).json({
			success: true,
			data: updated,
			message: 'Xác nhận đã nhận hàng trả về thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};

export const CompleteAdminReturnRequestController = async (req: Request, res: Response) => {
	try {
		const adminId = Number(res.locals.userId);
		const requestId = Number(req.params.id);

		if (Number.isNaN(adminId)) {
			return res.status(401).json({
				success: false,
				message: 'Không xác định được người dùng',
			});
		}

		if (Number.isNaN(requestId) || requestId <= 0) {
			return res.status(400).json({
				success: false,
				message: 'return_request_id không hợp lệ',
			});
		}

		const updated = await CompleteAdminReturnRequest(requestId, adminId);

		return res.status(200).json({
			success: true,
			data: updated,
			message: 'Hoàn tất xử lý trả hàng thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			message: error.message,
		});
	}
};
