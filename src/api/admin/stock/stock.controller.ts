import type { Request, Response } from 'express';
import { createStockInbound, getLowStockVariants, getStockLogs } from './stock.service.js';

export const GetLowStockVariantsController = async (req: Request, res: Response) => {
	try {
		const thresholdRaw = req.query.threshold as string | undefined;
		const threshold = thresholdRaw ? Number(thresholdRaw) : 5;

		if (Number.isNaN(threshold) || threshold < 0) {
			return res.status(400).json({
				success: false,
				error: 'threshold không hợp lệ',
			});
		}

		const variants = await getLowStockVariants(threshold);

		return res.status(200).json({
			success: true,
			data: variants,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

export const CreateStockInboundController = async (req: Request, res: Response) => {
	try {
		const adminId = Number(res.locals.userId);
		const entries = req.body;

		if (!Array.isArray(entries) || entries.length === 0) {
			return res.status(400).json({
				success: false,
				error: 'Body phải là mảng dữ liệu nhập kho',
			});
		}

		if (Number.isNaN(adminId)) {
			return res.status(400).json({
				success: false,
				error: 'Không xác định được admin',
			});
		}

		const payload = entries.map((item, index) => {
			const variant_id = Number(item.variant_id);
			const change_qty = Number(item.change_qty);
			const note = typeof item.note === 'string' ? item.note : undefined;

			if (Number.isNaN(variant_id) || Number.isNaN(change_qty) || change_qty <= 0) {
				throw new Error(`Dữ liệu không hợp lệ tại phần tử ${index + 1}`);
			}

			return { variant_id, change_qty, note };
		});

		const result = await createStockInbound(payload, adminId);

		return res.status(201).json({
			success: true,
			data: result,
			message: 'Nhập kho thành công',
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

export const GetStockLogsController = async (req: Request, res: Response) => {
	try {
		const variantIdRaw = req.query.variant_id as string | undefined;
		const date = req.query.date as string | undefined;

		const variantId = variantIdRaw ? Number(variantIdRaw) : undefined;
		if (variantIdRaw && Number.isNaN(variantId)) {
			return res.status(400).json({
				success: false,
				error: 'variant_id không hợp lệ',
			});
		}

		if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			return res.status(400).json({
				success: false,
				error: 'date không đúng định dạng YYYY-MM-DD',
			});
		}

		const logs = await getStockLogs({
			...(variantId ? { variant_id: variantId } : {}),
			...(date ? { date } : {}),
		});

		return res.status(200).json({
			success: true,
			data: logs,
		});
	} catch (error: any) {
		return res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};
