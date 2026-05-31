import prisma from '../../utils/prisma.js';
import AppError from '../../utils/appError.js';
import { deleteManyFromStorage, getStorageUrl, uploadManyToStorage } from '../../utils/storage.js';

const REVIEW_WINDOW_DAYS = 30;

export const createReview = async (
	userId: number,
	orderItemId: number,
	rating: number,
	comment: string | undefined,
	imageFiles: Express.Multer.File[] | undefined,
) => {
	// Validate rating
	if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
		throw new AppError('Đánh giá phải là số từ 1 đến 5', 400);
	}

	// Validate comment length
	if (comment && comment.length > 500) {
		throw new AppError('Bình luận không được vượt quá 500 ký tự', 400);
	}

	// Validate images count
	if (imageFiles && imageFiles.length > 10) {
		throw new AppError('Tối đa 10 ảnh được phép', 400);
	}

	// Check if order item exists and belongs to the user
	const orderItem = await prisma.orderItems.findUnique({
		where: { id: orderItemId },
		select: {
			id: true,
			order_id: true,
			variant_id: true,
			order: {
				select: {
					user_id: true,
					payments: {
						select: {
							paid_at: true,
							payment_status: true,
						},
						where: {
							payment_status: 'success',
						},
						orderBy: { paid_at: 'desc' },
						take: 1,
					},
				},
			},
		},
	});

	if (!orderItem) {
		throw new AppError('Đơn hàng không tồn tại', 404);
	}

	if (orderItem.order.user_id !== userId) {
		throw new AppError('Bạn không có quyền đánh giá sản phẩm này', 403);
	}

	// Check if order has been paid
	const successPayment = orderItem.order.payments[0];
	if (!successPayment || !successPayment.paid_at) {
		throw new AppError('Đơn hàng chưa được thanh toán', 400);
	}

	// Check if review is within 30 days after payment
	const paidAt = new Date(successPayment.paid_at);
	const now = new Date();
	const daysSincePaid = Math.floor((now.getTime() - paidAt.getTime()) / (1000 * 60 * 60 * 24));

	if (daysSincePaid > REVIEW_WINDOW_DAYS) {
		throw new AppError(`Bạn chỉ có thể đánh giá trong vòng ${REVIEW_WINDOW_DAYS} ngày sau khi thanh toán`, 400);
	}

	// Check if review already exists for this order item and variant
	const existingReview = await prisma.reviews.findUnique({
		where: {
			order_item_id_variant_id: {
				order_item_id: orderItemId,
				variant_id: orderItem.variant_id,
			},
		},
		select: { id: true },
	});

	if (existingReview) {
		throw new AppError('Bạn đã đánh giá sản phẩm này rồi', 400);
	}

	// Get product info for the variant
	const variant = await prisma.productVariants.findUnique({
		where: { id: orderItem.variant_id },
		select: {
			product_id: true,
			product: {
				select: {
					avg_rating: true,
					total_reviews: true,
				},
			},
		},
	});

	if (!variant) {
		throw new AppError('Sản phẩm không tồn tại', 404);
	}

	// Upload images if provided
	const uploadedImageKeys: string[] = [];
	if (imageFiles && imageFiles.length > 0) {
		try {
			const imageKeys = await uploadManyToStorage(imageFiles, 'reviews');
			uploadedImageKeys.push(...imageKeys);
		} catch (error) {
			throw new AppError('Lỗi khi tải ảnh lên', 500);
		}
	}

	// Create review with images in transaction
	try {
		const review = await prisma.$transaction(async (tx) => {
			const createdReview = await tx.reviews.create({
				data: {
					user_id: userId,
					product_id: variant.product_id,
					variant_id: orderItem.variant_id,
					order_item_id: orderItemId,
					rating,
					comment: comment ?? null,
				},
			});

			// Create review images
			if (uploadedImageKeys.length > 0) {
				const reviewImagesData = uploadedImageKeys.map((imageKey) => ({
					review_id: createdReview.id,
					image_url: imageKey,
				}));

				await tx.reviewImages.createMany({
					data: reviewImagesData,
				});
			}

			const currentTotalReviews = variant.product.total_reviews;
			const currentAvgRating = Number(variant.product.avg_rating);
			const nextTotalReviews = currentTotalReviews + 1;
			const nextAvgRating = ((currentAvgRating * currentTotalReviews) + rating) / nextTotalReviews;

			await tx.products.update({
				where: { id: variant.product_id },
				data: {
					total_reviews: nextTotalReviews,
					avg_rating: Math.round(nextAvgRating * 100) / 100,
				},
			});

			return createdReview;
		});

		return review;
	} catch (error) {
		// Cleanup uploaded images on error
		if (uploadedImageKeys.length > 0) {
			await deleteManyFromStorage(uploadedImageKeys).catch(() => undefined);
		}

		throw error;
	}
};

export const editReview = async (
	userId: number,
	reviewId: number,
	rating: number,
	comment: string | undefined,
	deletedImageKeys: string[] = [],
	imageFiles: Express.Multer.File[] | undefined,
) => {
	if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
		throw new AppError('Đánh giá phải là số từ 1 đến 5', 400);
	}

	if (comment && comment.length > 500) {
		throw new AppError('Bình luận không được vượt quá 500 ký tự', 400);
	}

	const review = await prisma.reviews.findUnique({
		where: { id: reviewId },
		select: {
			id: true,
			user_id: true,
			product_id: true,
			rating: true,
			product: {
				select: {
					avg_rating: true,
					total_reviews: true,
				},
			},
			order_item: {
				select: {
					order: {
						select: {
							payments: {
								select: { paid_at: true },
								where: { payment_status: 'success' },
								orderBy: { paid_at: 'desc' },
								take: 1,
							},
						},
					},
				},
			},
			images: { select: { image_url: true } },
		},
	});

	if (!review) {
		throw new AppError('Đánh giá không tồn tại', 404);
	}

	if (review.user_id !== userId) {
		throw new AppError('Bạn không có quyền chỉnh sửa đánh giá này', 403);
	}

	const successPayment = review.order_item.order.payments[0];
	if (!successPayment?.paid_at) {
		throw new AppError('Đơn hàng chưa được thanh toán', 400);
	}

	const paidAt = new Date(successPayment.paid_at);
	const now = new Date();
	const daysSincePaid = Math.floor((now.getTime() - paidAt.getTime()) / (1000 * 60 * 60 * 24));

	if (daysSincePaid > REVIEW_WINDOW_DAYS) {
		throw new AppError(`Bạn chỉ có thể chỉnh sửa trong vòng ${REVIEW_WINDOW_DAYS} ngày sau khi thanh toán`, 400);
	}

	const normalizedDeletedKeys = Array.from(
		new Set(deletedImageKeys.map((key) => key.trim()).filter((key) => Boolean(key))),
	);
	const existingImageKeys = new Set(review.images.map((image) => image.image_url));
	const invalidDeletedKeys = normalizedDeletedKeys.filter((key) => !existingImageKeys.has(key));

	if (invalidDeletedKeys.length > 0) {
		throw new AppError('Danh sách ảnh cần xóa không hợp lệ', 400);
	}

	const remainingImageCount = review.images.length - normalizedDeletedKeys.length;
	const newImageCount = imageFiles?.length ?? 0;

	if (remainingImageCount + newImageCount > 10) {
		throw new AppError('Tối đa 10 ảnh được phép', 400);
	}

	const uploadedImageKeys: string[] = [];
	if (imageFiles && imageFiles.length > 0) {
		try {
			const imageKeys = await uploadManyToStorage(imageFiles, 'reviews');
			uploadedImageKeys.push(...imageKeys);
		} catch (error) {
			throw new AppError('Lỗi khi tải ảnh lên', 500);
		}
	}

	try {
		const updatedReview = await prisma.$transaction(async (tx) => {
			if (normalizedDeletedKeys.length > 0) {
				await tx.reviewImages.deleteMany({
					where: {
						review_id: reviewId,
						image_url: { in: normalizedDeletedKeys },
					},
				});
			}

			const result = await tx.reviews.update({
				where: { id: reviewId },
				data: {
					rating,
					comment: comment ?? null,
					is_edited: true,
					edit_count: { increment: 1 },
				},
			});

			if (rating !== review.rating) {
				const totalReviews = review.product.total_reviews;
				const currentAvgRating = Number(review.product.avg_rating);
				const nextAvgRating = totalReviews > 0
					? ((currentAvgRating * totalReviews) - review.rating + rating) / totalReviews
					: rating;

				await tx.products.update({
					where: { id: review.product_id },
					data: {
						avg_rating: Math.round(nextAvgRating * 100) / 100,
					},
				});
			}

			if (uploadedImageKeys.length > 0) {
				await tx.reviewImages.createMany({
					data: uploadedImageKeys.map((imageKey) => ({
						review_id: reviewId,
						image_url: imageKey,
					})),
				});
			}

			return result;
		});

		if (normalizedDeletedKeys.length > 0) {
			await deleteManyFromStorage(normalizedDeletedKeys).catch(() => undefined);
		}

		return updatedReview;
	} catch (error) {
		if (uploadedImageKeys.length > 0) {
			await deleteManyFromStorage(uploadedImageKeys).catch(() => undefined);
		}

		throw error;
	}
};

export const getUnreviewedPaidOrderItems = async (userId: number) => {
	const now = new Date();

	const orderItems = await prisma.orderItems.findMany({
		where: {
			order: {
				user_id: userId,
				payment_status: 'paid',
				payments: {
					some: {
						payment_status: 'success',
						paid_at: { not: null },
					},
				},
			},
			reviews: {
				none: {},
			},
		},
		orderBy: {
			id: 'desc',
		},
		select: {
			id: true,
			order_id: true,
			variant_id: true,
			quantity: true,
			order: {
				select: {
					created_at: true,
					payments: {
						where: {
							payment_status: 'success',
							paid_at: { not: null },
						},
						orderBy: { paid_at: 'desc' },
						take: 1,
						select: { paid_at: true },
					},
				},
			},
			product_variant: {
				select: {
					id: true,
					sku: true,
					version: true,
					color: true,
					color_hex: true,
					product_images: {
						orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
						take: 1,
						select: { image_url: true },
					},
					product: {
						select: {
							id: true,
							name: true,
							slug: true,
							product_images: {
								orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
								take: 1,
								select: { image_url: true },
							},
						},
					},
				},
			},
		},
	});

	const availableItems = orderItems.filter((item) => {
		const paidAt = item.order.payments[0]?.paid_at;
		if (!paidAt) return false;

		const elapsedDays = Math.floor((now.getTime() - new Date(paidAt).getTime()) / (1000 * 60 * 60 * 24));
		return elapsedDays <= REVIEW_WINDOW_DAYS;
	});

	return Promise.all(availableItems.map(async (item) => {
		const variant = item.product_variant;
		const product = variant.product;
		const paidAt = item.order.payments[0]?.paid_at as Date;
		const elapsedDays = Math.floor((now.getTime() - new Date(paidAt).getTime()) / (1000 * 60 * 60 * 24));
		const remainingDays = Math.max(0, REVIEW_WINDOW_DAYS - elapsedDays);
		const imageKey = variant.product_images[0]?.image_url
			?? product.product_images[0]?.image_url
			?? null;

		return {
			order_item_id: item.id,
			order_id: item.order_id,
			paid_at: paidAt,
			remaining_days: remainingDays,
			quantity: item.quantity,
			product: {
				id: product.id,
				name: product.name,
				slug: product.slug,
			},
			variant: {
				id: variant.id,
				sku: variant.sku,
				version: variant.version,
				color: variant.color,
				color_hex: variant.color_hex,
			},
			image_url: imageKey ? await getStorageUrl(imageKey) : null,
		};
	}));
};

export const getProductReviews = async (
	productId: number,
	filters: {
		page?: number;
		limit?: number;
		variantId?: number;
		rating?: number;
	},
) => {
	const page = filters.page ?? 1;
	const limit = filters.limit ?? 10;

	if (page < 1 || limit < 1) {
		throw new AppError('Page và limit phải lớn hơn 0', 400);
	}

	if (filters.rating !== undefined && (!Number.isInteger(filters.rating) || filters.rating < 1 || filters.rating > 5)) {
		throw new AppError('rating không hợp lệ', 400);
	}

	// Check if product exists
	const product = await prisma.products.findUnique({
		where: { id: productId },
		select: { id: true, total_reviews: true, avg_rating: true },
	});

	if (!product) {
		throw new AppError('Sản phẩm không tồn tại', 404);
	}

	const where: any = {
		product_id: productId,
	};

	if (filters.variantId) {
		where.variant_id = filters.variantId;
	}

	if (filters.rating !== undefined) {
		where.rating = filters.rating;
	}

	const [total, reviews] = await Promise.all([
		prisma.reviews.count({ where }),
		prisma.reviews.findMany({
			where,
			orderBy: { created_at: 'desc' },
			skip: (page - 1) * limit,
			take: limit,
			select: {
				id: true,
				rating: true,
				comment: true,
				is_edited: true,
				edit_count: true,
				created_at: true,
				user: {
					select: {
						id: true,
						full_name: true,
					},
				},
				variant: {
					select: {
						id: true,
						version: true,
						color: true,
					},
				},
				images: {
					select: {
						image_url: true,
					},
				},
			},
		}),
	]);

	const reviewsWithUrls = await Promise.all(
		reviews.map(async (review) => ({
			...review,
			images: await Promise.all(
				review.images.map(async (img) => ({
					image_url: await getStorageUrl(img.image_url),
				})),
			),
		})),
	);

	const totalPages = Math.ceil(total / limit);

	return {
		items: reviewsWithUrls,
		summary: {
			total_reviews: product.total_reviews,
			avg_rating: Number(product.avg_rating),
		},
		pagination: {
			page,
			limit,
			total,
			total_pages: totalPages,
		},
	};
};

export const getVariantReviews = async (
	variantId: number,
	page: number = 1,
	limit: number = 10,
) => {
	if (page < 1 || limit < 1) {
		throw new AppError('Page và limit phải lớn hơn 0', 400);
	}

	// Check if variant exists
	const variant = await prisma.productVariants.findUnique({
		where: { id: variantId },
		select: { id: true },
	});

	if (!variant) {
		throw new AppError('Biến thể sản phẩm không tồn tại', 404);
	}

	const [total, reviews] = await Promise.all([
		prisma.reviews.count({
			where: { variant_id: variantId },
		}),
		prisma.reviews.findMany({
			where: { variant_id: variantId },
			orderBy: { created_at: 'desc' },
			skip: (page - 1) * limit,
			take: limit,
			select: {
				id: true,
				rating: true,
				comment: true,
				is_edited: true,
				edit_count: true,
				created_at: true,
				user: {
					select: {
						id: true,
						full_name: true,
					},
				},
				images: {
					select: {
						image_url: true,
					},
				},
			},
		}),
	]);

	const reviewsWithUrls = await Promise.all(
		reviews.map(async (review) => ({
			...review,
			images: await Promise.all(
				review.images.map(async (img) => ({
					image_url: await getStorageUrl(img.image_url),
				})),
			),
		})),
	);

	const totalPages = Math.ceil(total / limit);

	return {
		items: reviewsWithUrls,
		pagination: {
			page,
			limit,
			total,
			total_pages: totalPages,
		},
	};
};
