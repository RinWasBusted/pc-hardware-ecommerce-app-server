import { PayOS } from '@payos/node';
import type { CreatePaymentLinkRequest, CreatePaymentLinkResponse, PaymentLink, Webhook, WebhookData } from '@payos/node';
import 'dotenv/config';

export type PayOSWebhookPayload = Webhook;

let payOSClient: PayOS | null = null;

const getPayOSClient = () => {
	if (payOSClient) {
		return payOSClient;
	}

	const clientId = process.env.PAYOS_CLIENT_ID;
	const apiKey = process.env.PAYOS_API_KEY;
	const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

	if (!clientId || !apiKey || !checksumKey) {
		throw new Error('Thiếu cấu hình PayOS (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY)');
	}

	payOSClient = new PayOS({
		clientId,
		apiKey,
		checksumKey,
	});

	return payOSClient;
};

const getClientUrl = () => {
	if (process.env.MOBILE_APP_URL) {
		return process.env.MOBILE_APP_URL;
	}

	if (process.env.FRONTEND_URL) {
		return process.env.FRONTEND_URL;
	}

	return 'http://localhost:3000';
};

const normalizeClientPath = (baseUrl: string, path: string) => {
	const cleanBase = baseUrl.replace(/\/+$/, '');
	const cleanPath = path.replace(/^\/+/, '');
	return `${cleanBase}/${cleanPath}`;
};

const getReturnUrls = (orderId?: number) => {
	const clientUrl = getClientUrl();
	const isAppSchema = !clientUrl.startsWith('http://') && !clientUrl.startsWith('https://');

	let baseUrl = clientUrl;
	if (isAppSchema) {
		const scheme = clientUrl.split('://')[0];
		baseUrl = `${scheme}://payment`;
	}

	const successPath = isAppSchema ? 'success' : 'payment/success';
	const cancelPath = isAppSchema ? 'cancel' : 'payment/cancel';

	const returnUrl = normalizeClientPath(baseUrl, successPath);
	const cancelUrl = normalizeClientPath(baseUrl, cancelPath);

	const query = orderId ? `?orderId=${orderId}` : '';

	return {
		cancelUrl: `${cancelUrl}${query}`,
		returnUrl: `${returnUrl}${query}`,
	};
};

const getExpiredAt = () => {
	const expiresInSeconds = Number(process.env.PAYOS_EXPIRED_IN_SECONDS ?? '');
	if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
		return undefined;
	}

	return Math.floor(Date.now() / 1000) + expiresInSeconds;
};

export const createPayOSPaymentLink = async (
	paymentData: Omit<CreatePaymentLinkRequest, 'returnUrl' | 'cancelUrl'> & { orderId?: number },
): Promise<CreatePaymentLinkResponse> => {
	if (!paymentData) {
		throw new Error('Payment data is required');
	}

	const { orderId, ...rest } = paymentData;
	const { cancelUrl, returnUrl } = getReturnUrls(orderId);

	return getPayOSClient().paymentRequests.create({
		...rest,
		cancelUrl,
		returnUrl,
		...(rest.expiredAt !== undefined ? {} : (() => {
			const expiredAt = getExpiredAt();
			return expiredAt ? { expiredAt } : {};
		})()),
	});
};

export const verifyPayOSWebhook = async (payload: PayOSWebhookPayload): Promise<WebhookData> => {
	return getPayOSClient().webhooks.verify(payload);
};

export const getPayOSPaymentLink = async (orderCode: number): Promise<PaymentLink> => {
	return getPayOSClient().paymentRequests.get(orderCode);
};
