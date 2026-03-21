import https from 'https';
import crypto from 'crypto';
import { prisma } from '../../utils/prisma.js';

type MomoConfig = {
	partnerCode: string;
	accessKey: string;
	secretKey: string;
	redirectUrl: string;
	ipnUrl: string;
	endpoint: string;
};

type MomoCreateResponse = {
	resultCode?: number;
	message?: string;
	payUrl?: string;
	deeplink?: string;
	deeplinkWebInApp?: string;
	qrCodeUrl?: string;
	requestId?: string;
	orderId?: string;
	[Key: string]: any;
};

type MomoCallbackPayload = {
	partnerCode?: string;
	accessKey?: string;
	requestId?: string;
	amount?: string | number;
	orderId?: string;
	orderInfo?: string;
	orderType?: string;
	transId?: string | number;
	resultCode?: string | number;
	message?: string;
	payType?: string;
	responseTime?: string | number;
	extraData?: string;
	signature?: string;
};

const getMomoConfig = (): MomoConfig => {
	const partnerCode = process.env.MOMO_PARTNER_CODE;
	const accessKey = process.env.MOMO_ACCESS_KEY;
	const secretKey = process.env.MOMO_SECRET_KEY;
	const redirectUrl = process.env.MOMO_REDIRECT_URL;
	const ipnUrl = process.env.MOMO_IPN_URL;
	const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';

	if (!partnerCode || !accessKey || !secretKey || !redirectUrl || !ipnUrl) {
		throw new Error('Thiếu cấu hình MoMo (MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY, MOMO_REDIRECT_URL, MOMO_IPN_URL)');
	}

	return {
		partnerCode,
		accessKey,
		secretKey,
		redirectUrl,
		ipnUrl,
		endpoint,
	};
};

const signHmacSHA256 = (rawSignature: string, secretKey: string) => {
	return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
};

const requestMomo = async (endpoint: string, payload: Record<string, any>) => {
	const requestBody = JSON.stringify(payload);
	const url = new URL(endpoint);

	return new Promise<MomoCreateResponse>((resolve, reject) => {
		const req = https.request(
			{
				hostname: url.hostname,
				port: url.port ? Number(url.port) : 443,
				path: `${url.pathname}${url.search}`,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(requestBody),
				},
			},
			(res) => {
				let data = '';
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					try {
						const parsed = JSON.parse(data);
						resolve(parsed);
					} catch (error) {
						reject(new Error('Không thể parse phản hồi từ MoMo'));
					}
				});
			},
		);

		req.on('error', (error) => {
			reject(error);
		});

		req.write(requestBody);
		req.end();
	});
};

const buildMomoOrderIds = (orderId: number, paymentId: number) => {
	const timestamp = Date.now();
	const momoOrderId = `ORDER_${orderId}_${timestamp}`;
	const requestId = `REQ_${paymentId}_${timestamp}`;
	return { momoOrderId, requestId };
};

const encodeExtraData = (payload: { order_id: number; payment_id: number }) => {
	return Buffer.from(JSON.stringify(payload)).toString('base64');
};

const decodeExtraData = (extraData?: string) => {
	if (!extraData) return null;
	try {
		const decoded = Buffer.from(extraData, 'base64').toString('utf8');
		const parsed = JSON.parse(decoded);
		if (typeof parsed?.order_id === 'number' && typeof parsed?.payment_id === 'number') {
			return {
				order_id: parsed.order_id,
				payment_id: parsed.payment_id,
			};
		}
	} catch (_error) {
		return null;
	}
	return null;
};

const parseOrderIdFromMomo = (orderId?: string) => {
	if (!orderId) return null;
	if (/^\d+$/.test(orderId)) return Number(orderId);
	const match = orderId.match(/ORDER_(\d+)_/);
	if (match) return Number(match[1]);
	return null;
};

const normalizeCallbackValue = (value?: string | number) => {
	if (value === undefined || value === null) return '';
	return String(value);
};

const verifyMomoCallbackSignature = (payload: MomoCallbackPayload, secretKey: string, accessKey: string) => {
	if (!payload.signature) return false;
	const rawSignature = [
		`accessKey=${accessKey}`,
		`amount=${normalizeCallbackValue(payload.amount)}`,
		`extraData=${normalizeCallbackValue(payload.extraData)}`,
		`message=${normalizeCallbackValue(payload.message)}`,
		`orderId=${normalizeCallbackValue(payload.orderId)}`,
		`orderInfo=${normalizeCallbackValue(payload.orderInfo)}`,
		`orderType=${normalizeCallbackValue(payload.orderType)}`,
		`partnerCode=${normalizeCallbackValue(payload.partnerCode)}`,
		`payType=${normalizeCallbackValue(payload.payType)}`,
		`requestId=${normalizeCallbackValue(payload.requestId)}`,
		`responseTime=${normalizeCallbackValue(payload.responseTime)}`,
		`resultCode=${normalizeCallbackValue(payload.resultCode)}`,
		`transId=${normalizeCallbackValue(payload.transId)}`,
	].join('&');

	const expectedSignature = signHmacSHA256(rawSignature, secretKey);
	return expectedSignature === payload.signature;
};

export const CreateMomoPayment = async (userId: number, orderId: number) => {
	const order = await prisma.orders.findFirst({
		where: {
			id: orderId,
			user_id: userId,
		},
		select: {
			id: true,
			user_id: true,
			total: true,
			payment_method: true,
			payment_status: true,
			order_status: true,
		},
	});

	if (!order) {
		throw new Error('Đơn hàng không tồn tại');
	}

	if (order.payment_method !== 'momo') {
		throw new Error('Đơn hàng không sử dụng phương thức thanh toán MoMo');
	}

	if (order.payment_status === 'paid') {
		throw new Error('Đơn hàng đã được thanh toán');
	}

	if (order.order_status === 'cancelled' || order.order_status === 'failed') {
		throw new Error('Đơn hàng đã bị hủy hoặc thất bại');
	}

	const totalAmount = Math.round(Number(order.total));
	if (Number.isNaN(totalAmount) || totalAmount <= 0) {
		throw new Error('Số tiền thanh toán không hợp lệ');
	}

	await prisma.payments.updateMany({
		where: {
			order_id: order.id,
			method: 'momo',
			payment_status: 'pending',
		},
		data: { payment_status: 'failed' },
	});

	const payment = await prisma.payments.create({
		data: {
			order_id: order.id,
			method: 'momo',
			amount: totalAmount,
			payment_status: 'pending',
		},
	});

	const config = getMomoConfig();
	const { momoOrderId, requestId } = buildMomoOrderIds(order.id, payment.id);
	const orderInfo = `Thanh toan don hang #${order.id}`;
	const extraData = encodeExtraData({ order_id: order.id, payment_id: payment.id });
	const requestType = 'captureWallet';

	const rawSignature = [
		`accessKey=${config.accessKey}`,
		`amount=${totalAmount}`,
		`extraData=${extraData}`,
		`ipnUrl=${config.ipnUrl}`,
		`orderId=${momoOrderId}`,
		`orderInfo=${orderInfo}`,
		`partnerCode=${config.partnerCode}`,
		`redirectUrl=${config.redirectUrl}`,
		`requestId=${requestId}`,
		`requestType=${requestType}`,
	].join('&');

	const signature = signHmacSHA256(rawSignature, config.secretKey);

	const momoPayload = {
		partnerCode: config.partnerCode,
		accessKey: config.accessKey,
		requestId,
		amount: totalAmount,
		orderId: momoOrderId,
		orderInfo,
		redirectUrl: config.redirectUrl,
		ipnUrl: config.ipnUrl,
		extraData,
		requestType,
		signature,
		lang: 'vi',
	};

	let momoResponse: MomoCreateResponse;
	try {
		momoResponse = await requestMomo(config.endpoint, momoPayload);
	} catch (error: any) {
		await prisma.payments.update({
			where: { id: payment.id },
			data: {
				payment_status: 'failed',
				gateway_response: {
					message: error?.message ?? 'MoMo request failed',
					endpoint: config.endpoint,
				},
			},
		});
		throw new Error('Không thể kết nối MoMo');
	}

	const resultCode = typeof momoResponse.resultCode === 'number'
		? momoResponse.resultCode
		: Number(momoResponse.resultCode ?? NaN);
	const isSuccess = resultCode === 0;

	await prisma.payments.update({
		where: { id: payment.id },
		data: {
			gateway_response: momoResponse,
			...(isSuccess ? {} : { payment_status: 'failed' }),
		},
	});

	if (!isSuccess) {
		throw new Error(momoResponse.message || 'Tạo thanh toán MoMo thất bại');
	}

	return {
		payment_id: payment.id,
		order_id: order.id,
		amount: totalAmount,
		momo: momoResponse,
	};
};

export const HandleMomoCallback = async (payload: MomoCallbackPayload) => {
	const config = getMomoConfig();

	const signatureValid = verifyMomoCallbackSignature(payload, config.secretKey, config.accessKey);
	if (!signatureValid) {
		throw new Error('Chữ ký MoMo không hợp lệ');
	}

	const decoded = decodeExtraData(payload.extraData);
	const orderId = decoded?.order_id ?? parseOrderIdFromMomo(payload.orderId);
	const paymentId = decoded?.payment_id ?? null;

	if (!orderId) {
		throw new Error('Không xác định được đơn hàng từ MoMo');
	}

	return prisma.$transaction(async (tx) => {
		const order = await tx.orders.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				user_id: true,
				payment_status: true,
				order_status: true,
			},
		});

		if (!order) {
			throw new Error('Đơn hàng không tồn tại');
		}

		let payment = paymentId
			? await tx.payments.findUnique({ where: { id: paymentId } })
			: null;

		if (!payment) {
			payment = await tx.payments.findFirst({
				where: {
					order_id: order.id,
					method: 'momo',
				},
				orderBy: { created_at: 'desc' },
			});
		}

		if (!payment) {
			throw new Error('Không tìm thấy giao dịch thanh toán');
		}

		const resultCode = Number(payload.resultCode ?? NaN);
		const isSuccess = resultCode === 0;
		const nextPaymentStatus = isSuccess ? 'success' : 'failed';

		const paymentUpdates: any = {
			gateway_response: payload,
		};

		if (payment.payment_status !== 'success') {
			paymentUpdates.payment_status = nextPaymentStatus;
		}

		if (isSuccess) {
			paymentUpdates.paid_at = payment.paid_at ?? new Date();
			if (payload.transId !== undefined && payload.transId !== null) {
				paymentUpdates.transaction_id = String(payload.transId);
			}
		}

		await tx.payments.update({
			where: { id: payment.id },
			data: paymentUpdates,
		});

		if (isSuccess && order.payment_status !== 'paid') {
			await tx.orders.update({
				where: { id: order.id },
				data: {
					payment_status: 'paid',
				},
			});

			await tx.orderStatusLogs.create({
				data: {
					order_id: order.id,
					changed_by: order.user_id,
					old_status: order.order_status,
					new_status: order.order_status,
					note: 'Thanh toan MoMo thanh cong',
				},
			});
		}

		return {
			order_id: order.id,
			payment_id: payment.id,
			is_success: isSuccess,
		};
	});
};
