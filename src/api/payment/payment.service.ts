import { prisma } from '../../utils/prisma.js';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
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
			orderId: order.id,
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

	// PayOS sends a webhook with description 'confirm-webhook' or dummy order codes to verify the webhook endpoint.
	// If the webhook signature is verified successfully, we return a success response immediately.
	if (
		webhookData.description === 'confirm-webhook' || 
		paymentId === 0 || 
		paymentId === 123
	) {
		return {
			success: true,
			message: 'Webhook verified successfully (Test/Confirm)',
		};
	}

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
			},
		});

		let orderId = payment?.order_id;
		if (!orderId && webhookData.description) {
			const match = webhookData.description.match(/^DH(\d+)-TT/);
			if (match) {
				orderId = Number(match[1]);
			}
		}

		if (!orderId) {
			throw new Error('Không xác định được đơn hàng cho giao dịch này');
		}

		const order = await tx.orders.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				user_id: true,
				payment_status: true,
				order_status: true,
				total: true,
			},
		});

		if (!order) {
			throw new Error('Đơn hàng không tồn tại');
		}

		const paymentUpdates: {
			gateway_response: ReturnType<typeof mapGatewayResponse>;
			payment_status?: 'success' | 'failed';
			paid_at?: Date;
			transaction_id?: string;
		} = {
			gateway_response: nextGatewayResponse,
		};

		if (nextStatus === 'PAID') {
			paymentUpdates.payment_status = 'success';
			paymentUpdates.paid_at = payment?.paid_at ?? new Date();
			const transactionReference = getLatestTransactionReference(paymentLink);
			if (transactionReference) {
				paymentUpdates.transaction_id = transactionReference;
			}
		} else if (TERMINAL_FAILED_STATUSES.has(nextStatus)) {
			paymentUpdates.payment_status = 'failed';
		}

		if (payment) {
			if (payment.payment_status !== 'success') {
				await tx.payments.update({
					where: { id: payment.id },
					data: paymentUpdates,
				});
			}
		} else if (nextStatus === 'PAID') {
			await tx.payments.create({
				data: {
					order_id: order.id,
					method: 'bank_transfer',
					amount: order.total,
					payment_status: 'success',
					paid_at: paymentUpdates.paid_at,
					transaction_id: paymentUpdates.transaction_id,
					gateway_response: nextGatewayResponse as any,
				},
			});
		}

		if (nextStatus === 'PAID' && order.payment_status !== 'paid') {
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
					note: 'Thanh toán PayOS thành công',
				},
			});
		}

		return {
			order_id: order.id,
			payment_id: payment?.id ?? null,
			payment_status: paymentUpdates.payment_status ?? payment?.payment_status ?? 'success',
			payosStatus: nextStatus,
		};
	});
};

export const CheckPayOSPayment = async (userId: number, orderId: number) => {
	const order = await prisma.orders.findFirst({
		where: {
			id: orderId,
			user_id: userId,
		},
		select: {
			id: true,
			user_id: true,
			payment_status: true,
			order_status: true,
			total: true,
		},
	});

	if (!order) {
		throw new Error('Đơn hàng không tồn tại');
	}

	const latestPayment = await prisma.payments.findFirst({
		where: {
			order_id: orderId,
			method: 'bank_transfer',
		},
		orderBy: {
			created_at: 'desc',
		},
	});

	if (!latestPayment) {
		throw new Error('Không tìm thấy giao dịch thanh toán cho đơn hàng này');
	}

	let paymentLink: Awaited<ReturnType<typeof getPayOSPaymentLink>>;
	try {
		paymentLink = await getPayOSPaymentLink(latestPayment.id);
	} catch (error: any) {
		throw new Error(`Không thể truy vấn thông tin thanh toán từ PayOS: ${error.message}`);
	}

	const nextStatus = paymentLink.status;
	const gatewayResponse = mapGatewayResponse({} as any, paymentLink);

	return prisma.$transaction(async (tx) => {
		const currentPayment = await tx.payments.findUnique({
			where: { id: latestPayment.id },
		});

		const paymentUpdates: {
			gateway_response: any;
			payment_status?: 'success' | 'failed';
			paid_at?: Date;
			transaction_id?: string;
		} = {
			gateway_response: gatewayResponse,
		};

		if (nextStatus === 'PAID') {
			paymentUpdates.payment_status = 'success';
			paymentUpdates.paid_at = currentPayment?.paid_at ?? new Date();
			const transactionReference = getLatestTransactionReference(paymentLink);
			if (transactionReference) {
				paymentUpdates.transaction_id = transactionReference;
			}
		} else if (TERMINAL_FAILED_STATUSES.has(nextStatus)) {
			paymentUpdates.payment_status = 'failed';
		}

		if (currentPayment) {
			if (currentPayment.payment_status !== 'success') {
				await tx.payments.update({
					where: { id: currentPayment.id },
					data: paymentUpdates,
				});
			}
		} else if (nextStatus === 'PAID') {
			await tx.payments.create({
				data: {
					order_id: order.id,
					method: 'bank_transfer',
					amount: order.total,
					payment_status: 'success',
					paid_at: paymentUpdates.paid_at,
					transaction_id: paymentUpdates.transaction_id,
					gateway_response: gatewayResponse as any,
				},
			});
		}

		if (nextStatus === 'PAID' && order.payment_status !== 'paid') {
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
					note: 'Thanh toán PayOS thành công (Truy vấn thủ công)',
				},
			});
		}

		return {
			order_id: order.id,
			payment_id: currentPayment?.id ?? null,
			payment_status: paymentUpdates.payment_status ?? currentPayment?.payment_status ?? 'success',
			payosStatus: nextStatus,
		};
	});
};

export interface GetPaymentsFilters {
	page: number;
	limit: number;
	payment_status?: PaymentStatus;
	method?: PaymentMethod;
	user_id?: number;
}

export const GetPayments = async (filters: GetPaymentsFilters) => {
	const { page, limit, payment_status, method, user_id } = filters;

	const where: any = {};

	if (user_id !== undefined) {
		where.order = {
			user_id,
		};
	}

	if (payment_status) {
		where.payment_status = payment_status;
	}

	if (method) {
		where.method = method;
	}

	const [total, payments] = await Promise.all([
		prisma.payments.count({ where }),
		prisma.payments.findMany({
			where,
			orderBy: { created_at: 'desc' },
			skip: (page - 1) * limit,
			take: limit,
			include: {
				order: {
					select: {
						id: true,
						total: true,
						order_status: true,
						user: {
							select: {
								id: true,
								full_name: true,
								email: true,
							},
						},
					},
				},
			},
		}),
	]);

	const items = payments.map((payment) => ({
		id: payment.id,
		order_id: payment.order_id,
		method: payment.method,
		amount: Number(payment.amount),
		transaction_id: payment.transaction_id,
		gateway_response: payment.gateway_response,
		payment_status: payment.payment_status,
		paid_at: payment.paid_at,
		created_at: payment.created_at,
		order: {
			id: payment.order.id,
			total: Number(payment.order.total),
			order_status: payment.order.order_status,
			user: payment.order.user ? {
				id: payment.order.user.id,
				full_name: payment.order.user.full_name,
				email: payment.order.user.email,
			} : undefined,
		},
	}));

	return {
		items,
		pagination: {
			total,
			page,
			limit,
			hasMore: page * limit < total,
		},
	};
};
