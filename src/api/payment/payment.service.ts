import { prisma } from '../../utils/prisma.js';
import {
	createPayOSPaymentLink,
	getPayOSPaymentLink,
	type PayOSWebhookPayload,
	verifyPayOSWebhook,
} from '../../utils/payment.js';

type PaymentLinkStatus = 'PENDING' | 'CANCELLED' | 'UNDERPAID' | 'PAID' | 'EXPIRED' | 'PROCESSING' | 'FAILED';

const TERMINAL_FAILED_STATUSES = new Set<PaymentLinkStatus>(['CANCELLED', 'EXPIRED', 'FAILED', 'UNDERPAID']);
const NON_TERMINAL_STATUSES = new Set<PaymentLinkStatus>(['PENDING', 'PROCESSING']);

const mapGatewayResponse = (webhookPayload: PayOSWebhookPayload, paymentLink: Awaited<ReturnType<typeof getPayOSPaymentLink>>) => ({
	webhook: webhookPayload,
	paymentLink,
});

const getLatestTransactionReference = (paymentLink: Awaited<ReturnType<typeof getPayOSPaymentLink>>) => {
	const latestTransaction = paymentLink.transactions.at(-1);
	return latestTransaction?.reference ?? null;
};

export const CreatePayOSPayment = async (userId: number, orderId: number) => {
	const order = await prisma.orders.findFirst({
		where: {
			id: orderId,
			user_id: userId,
		},
		select: {
			id: true,
			total: true,
			payment_method: true,
			payment_status: true,
			order_status: true,
			user: {
				select: {
					full_name: true,
					email: true,
					phone_number: true,
				},
			},
			address: {
				select: {
					street: true,
					ward: true,
					district: true,
					province: true,
				},
			},
		},
	});

	if (!order) {
		throw new Error('Đơn hàng không tồn tại');
	}

	if (order.payment_method !== 'bank_transfer') {
		throw new Error('Đơn hàng không sử dụng phương thức thanh toán chuyển khoản');
	}

	if (order.payment_status === 'paid') {
		throw new Error('Đơn hàng đã được thanh toán');
	}

	if (order.order_status === 'cancelled' || order.order_status === 'failed') {
		throw new Error('Đơn hàng đã bị hủy hoặc thất bại');
	}

	const amount = Math.round(Number(order.total));
	if (Number.isNaN(amount) || amount <= 0) {
		throw new Error('Số tiền thanh toán không hợp lệ');
	}

	const payment = await prisma.$transaction(async (tx) => {
		await tx.payments.updateMany({
			where: {
				order_id: order.id,
				method: 'bank_transfer',
				payment_status: 'pending',
			},
			data: {
				payment_status: 'failed',
			},
		});

		return tx.payments.create({
			data: {
				order_id: order.id,
				method: 'bank_transfer',
				amount,
				payment_status: 'pending',
			},
		});
	});

	try {
		const paymentData = await createPayOSPaymentLink({
			orderCode: payment.id,
			amount,
			description: `DH${order.id}-TT${payment.id}`,
			buyerName: order.user.full_name,
			buyerEmail: order.user.email,
			...(
				order.user.phone_number
					? { buyerPhone: order.user.phone_number }
					: {}
			),
			...(() => {
				const buyerAddress = [order.address.street, order.address.ward, order.address.district, order.address.province]
					.filter(Boolean)
					.join(', ');
				return buyerAddress ? { buyerAddress } : {};
			})(),
		});

		await prisma.payments.update({
			where: { id: payment.id },
			data: {
				gateway_response: paymentData,
			},
		});

		return {
			payment_id: payment.id,
			order_id: order.id,
			paymentUrl: paymentData.checkoutUrl,
			paymentData,
		};
	} catch (error: any) {
		await prisma.payments.update({
			where: { id: payment.id },
			data: {
				payment_status: 'failed',
				gateway_response: {
					message: error?.message ?? 'PayOS request failed',
				},
			},
		});

		throw new Error('Không thể tạo thanh toán PayOS');
	}
};

export const HandlePayOSWebhook = async (payload: PayOSWebhookPayload) => {
	const webhookData = await verifyPayOSWebhook(payload);
	const paymentId = Number(webhookData.orderCode);

	if (!Number.isInteger(paymentId) || paymentId <= 0) {
		throw new Error('orderCode PayOS không hợp lệ');
	}

	const paymentLink = await getPayOSPaymentLink(paymentId);
	const nextGatewayResponse = mapGatewayResponse(payload, paymentLink);
	const nextStatus = paymentLink.status;

	return prisma.$transaction(async (tx) => {
		const payment = await tx.payments.findUnique({
			where: { id: paymentId },
			select: {
				id: true,
				order_id: true,
				payment_status: true,
				paid_at: true,
				order: {
					select: {
						id: true,
						user_id: true,
						payment_status: true,
						order_status: true,
					},
				},
			},
		});

		if (!payment) {
			throw new Error('Không tìm thấy giao dịch thanh toán');
		}

		const paymentUpdates: {
			gateway_response: ReturnType<typeof mapGatewayResponse>;
			payment_status?: 'success' | 'failed';
			paid_at?: Date;
			transaction_id?: string;
		} = {
			gateway_response: nextGatewayResponse,
		};

		if (payment.payment_status !== 'success') {
			if (nextStatus === 'PAID') {
				paymentUpdates.payment_status = 'success';
			} else if (TERMINAL_FAILED_STATUSES.has(nextStatus)) {
				paymentUpdates.payment_status = 'failed';
			}
		}

		if (nextStatus === 'PAID') {
			paymentUpdates.paid_at = payment.paid_at ?? new Date();
			const transactionReference = getLatestTransactionReference(paymentLink);
			if (transactionReference) {
				paymentUpdates.transaction_id = transactionReference;
			}
		}

		await tx.payments.update({
			where: { id: payment.id },
			data: paymentUpdates,
		});

		if (nextStatus === 'PAID' && payment.order.payment_status !== 'paid') {
			await tx.orders.update({
				where: { id: payment.order.id },
				data: {
					payment_status: 'paid',
				},
			});

			await tx.orderStatusLogs.create({
				data: {
					order_id: payment.order.id,
					changed_by: payment.order.user_id,
					old_status: payment.order.order_status,
					new_status: payment.order.order_status,
					note: 'Thanh toán PayOS thành công',
				},
			});
		}

		if (TERMINAL_FAILED_STATUSES.has(nextStatus) || NON_TERMINAL_STATUSES.has(nextStatus) || nextStatus === 'PAID') {
			return {
				order_id: payment.order.id,
				payment_id: payment.id,
				payment_status: paymentUpdates.payment_status ?? payment.payment_status,
				payosStatus: nextStatus,
			};
		}

		return {
			order_id: payment.order.id,
			payment_id: payment.id,
			payment_status: payment.payment_status,
			payosStatus: nextStatus,
		};
	});
};
