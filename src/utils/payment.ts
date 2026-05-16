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

const normalizeClientPath = (baseUrl: string, path: string) => `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

const getReturnUrls = () => {
	const clientUrl = getClientUrl();

	return {
		cancelUrl: normalizeClientPath(clientUrl, '/payment/cancel'),
		returnUrl: normalizeClientPath(clientUrl, '/payment/success'),
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
	paymentData: Omit<CreatePaymentLinkRequest, 'returnUrl' | 'cancelUrl'>,
): Promise<CreatePaymentLinkResponse> => {
	if (!paymentData) {
		throw new Error('Payment data is required');
	}

	const { cancelUrl, returnUrl } = getReturnUrls();

	return getPayOSClient().paymentRequests.create({
		...paymentData,
		cancelUrl,
		returnUrl,
		...(paymentData.expiredAt !== undefined ? {} : (() => {
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
