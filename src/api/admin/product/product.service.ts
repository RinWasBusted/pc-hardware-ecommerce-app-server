import { Prisma } from '@prisma/client'
import prisma from "../../../utils/prisma.js"
import type { ProductStatus } from "../../../generated/prisma/index.js"
import { deleteImageFromCloudinary, getCloudinaryImageUrl } from '../../../utils/cloudinary.js'

export type AdminProductListFilters = {
    page: number;
    limit: number;
    keyword?: string;
    categoryId?: number;
    brandId?: number;
    priceMin?: number;
    priceMax?: number;
    status?: ProductStatus;
}

const mapAdminProductCard = (product: {
    id: number;
    sku: string;
    name: string;
    slug: string;
    status: ProductStatus;
    brand: { id: number; name: string; logo_url: string | null };
    category: { id: number; name: string; slug: string };
    product_images: Array<{ image_url: string }>;
    product_variants: Array<{ price: any }>;
}) => {
    const prices = product.product_variants
        .map((variant) => Number(variant.price))
        .filter((price) => !Number.isNaN(price));

    const price_min = prices.length > 0 ? Math.min(...prices) : null;
    const price_max = prices.length > 0 ? Math.max(...prices) : null;

    const primaryImage = product.product_images[0]?.image_url ?? null;

    return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        slug: product.slug,
        status: product.status,
        category: product.category,
        brand: {
            ...product.brand,
            logo_url: product.brand.logo_url
                ? getCloudinaryImageUrl(product.brand.logo_url)
                : null,
        },
        primary_image: primaryImage ? getCloudinaryImageUrl(primaryImage) : null,
        price_min,
        price_max,
    };
};

const mapVariantUniqueError = (error: any) => {
    const errorMessage = typeof error?.message === 'string' ? error.message : ''
    const isUniqueError = errorMessage.includes('Unique constraint failed on the fields')

    if ((error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') || isUniqueError) {
        const target = error?.meta?.target
        const targetText = Array.isArray(target) ? target.join(',') : String(target ?? '')

        const hasSku = targetText.includes('sku') || errorMessage.includes('`sku`')
        const hasProductId = targetText.includes('product_id') || errorMessage.includes('`product_id`')
        const hasVersion = targetText.includes('version') || errorMessage.includes('`version`')
        const hasColor = targetText.includes('color') || errorMessage.includes('`color`')

        if (hasProductId && hasVersion && hasColor) {
            return 'Biến thể trùng version và color trong cùng sản phẩm'
        }

        if (hasSku) {
            return 'SKU biến thể đã tồn tại'
        }
    }

    return null
}

export const createProduct = async (
    sku: string,
    name: string,
    slug: string,
    description: string,
    category_id: number,
    brand_id: number,
    specifications: object | undefined,
    status: ProductStatus | undefined,
    variants: any[],
    productImagePublicIds: string[],
    variantImagePublicIds: string[],
) => {

    const existingSlug = await prisma.products.findUnique({
        where: { slug },
        select: { id: true }
    })

    if(existingSlug){
        throw new Error('Slug đã tồn tại, vui lòng đổi tên sản phẩm')
    }

    const existingSku = await prisma.products.findUnique({
        where: { sku },
        select: { id: true }
    })

    if(existingSku){
        throw new Error('SKU đã tồn tại, vui lòng đổi SKU sản phẩm')
    }

    const existingBrand = await prisma.brands.findUnique({
        where: { id: brand_id },
        select: { id: true }
    })

    if(!existingBrand){
        throw new Error('Thương hiệu không tồn tại')
    }

    const existingCategory = await prisma.categories.findUnique({
        where: { id: category_id },
        select: { id: true }
    })

    if(!existingCategory){
        throw new Error('Danh mục không tồn tại')
    }

    if (variantImagePublicIds.length !== variants.length) {
        throw new Error('Số lượng ảnh biến thể không khớp')
    }

    let product
    try {
        product = await prisma.$transaction(async (tx) => {
            const createdProduct = await tx.products.create({
                data: {
                    sku,
                    name,
                    slug,
                    description,
                    category_id,
                    brand_id,
                    ...(specifications? { specifications } : {}),
                    ...(status ? { status } : {}),
                    product_variants: {
                        create: variants.map(variant => ({
                            sku: variant.sku,
                            version: variant.version,
                            color: variant.color,
                            color_hex: variant.color_hex,
                            price: variant.price,
                            compare_at_price: variant.compare_at_price,
                            stock: variant.stock,
                            is_active: variant.is_active ?? true
                        }))
                    }
                },
                include: {
                    product_variants: {
                        select: {
                            id: true,
                            sku: true,
                        }
                    }
                }
            })

            if (createdProduct.product_variants.length !== variants.length) {
                throw new Error('Tạo biến thể sản phẩm thất bại')
            }

            const variantIdBySku = new Map(
                createdProduct.product_variants.map((variant) => [variant.sku, variant.id]),
            )

            const productImagesData = productImagePublicIds.map((publicId, index) => ({
                product_id: createdProduct.id,
                image_url: publicId,
                is_primary: index === 0,
                sort_order: index,
            }))

            const variantImagesData = variantImagePublicIds.map((publicId, index) => {
                const variantSku = variants[index]?.sku
                const variantId = variantSku ? variantIdBySku.get(variantSku) : undefined

                if (!variantId) {
                    throw new Error('Không tìm thấy biến thể để gán ảnh')
                }

                return {
                    product_id: createdProduct.id,
                    variant_id: variantId,
                    image_url: publicId,
                    sort_order: 0,
                }
            })

            const imagesData = [...productImagesData, ...variantImagesData]

            if (imagesData.length > 0) {
                await tx.productImages.createMany({
                    data: imagesData,
                })
            }

            return createdProduct
        })
    } catch (error: any) {
        const mappedError = mapVariantUniqueError(error)
        if (mappedError) {
            throw new Error(mappedError)
        }

        throw error
    }

    if(!product){
        throw new Error('Tạo sản phẩm thất bại')
    }

    return product
}

export const updateProductInfo = async (productId: number, data: {
    sku?: string;
    name?: string;
    slug?: string;
    description?: string | null;
    category_id?: number;
    brand_id?: number;
    specifications?: object | null;
}) => {
    const existingProduct = await prisma.products.findUnique({
        where: { id: productId },
        select: { id: true }
    })

    if (!existingProduct) {
        throw new Error('Sản phẩm không tồn tại')
    }

    if (data.sku) {
        const duplicateSku = await prisma.products.findFirst({
            where: {
                sku: data.sku,
                id: { not: productId }
            },
            select: { id: true }
        })

        if (duplicateSku) {
            throw new Error('SKU đã tồn tại, vui lòng đổi SKU sản phẩm')
        }
    }

    if (data.slug) {
        const duplicateSlug = await prisma.products.findFirst({
            where: {
                slug: data.slug,
                id: { not: productId }
            },
            select: { id: true }
        })

        if (duplicateSlug) {
            throw new Error('Slug đã tồn tại, vui lòng đổi tên sản phẩm')
        }
    }

    if (data.brand_id !== undefined) {
        const existingBrand = await prisma.brands.findUnique({
            where: { id: data.brand_id },
            select: { id: true }
        })

        if (!existingBrand) {
            throw new Error('Thương hiệu không tồn tại')
        }
    }

    if (data.category_id !== undefined) {
        const existingCategory = await prisma.categories.findUnique({
            where: { id: data.category_id },
            select: { id: true }
        })

        if (!existingCategory) {
            throw new Error('Danh mục không tồn tại')
        }
    }

    const updatePayload: any = {}

    if (data.sku !== undefined) updatePayload.sku = data.sku
    if (data.name !== undefined) updatePayload.name = data.name
    if (data.slug !== undefined) updatePayload.slug = data.slug
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.category_id !== undefined) updatePayload.category_id = data.category_id
    if (data.brand_id !== undefined) updatePayload.brand_id = data.brand_id
    if (data.specifications !== undefined) updatePayload.specifications = data.specifications

    const updatedProduct = await prisma.products.update({
        where: { id: productId },
        data: updatePayload
    })

    return updatedProduct
}

export const updateProductStatus = async (productId: number, status: ProductStatus) => {
    const existingProduct = await prisma.products.findUnique({
        where: { id: productId },
        select: { id: true }
    })

    if (!existingProduct) {
        throw new Error('Sản phẩm không tồn tại')
    }

    return prisma.products.update({
        where: { id: productId },
        data: { status }
    })
}

export const deleteProduct = async (productId: number) => {
    const product = await prisma.products.findUnique({
        where: { id: productId },
        select: {
            id: true,
            _count: {
                select: {
                    reviews: true,
                    wishlists: true,
                }
            }
        }
    })

    if (!product) {
        throw new Error('Sản phẩm không tồn tại')
    }

    if (product._count.reviews > 0 || product._count.wishlists > 0) {
        throw new Error('Không thể xóa sản phẩm đã phát sinh đánh giá hoặc wishlist')
    }

    const variantRefs = await prisma.productVariants.findMany({
        where: { product_id: productId },
        select: {
            id: true,
            _count: {
                select: {
                    cart_items: true,
                    order_items: true,
                    reviews: true,
                }
            }
        }
    })

    const hasBlockingVariant = variantRefs.some((variant) =>
        variant._count.cart_items > 0
        || variant._count.order_items > 0
        || variant._count.reviews > 0
    )

    if (hasBlockingVariant) {
        throw new Error('Không thể xóa sản phẩm đang có đơn hàng, giỏ hàng hoặc đánh giá')
    }

    await prisma.$transaction([
        prisma.productImages.deleteMany({ where: { product_id: productId } }),
        prisma.stockLogs.deleteMany({ where: { product_variant: { product_id: productId } } }),
        prisma.productVariants.deleteMany({ where: { product_id: productId } }),
        prisma.products.delete({ where: { id: productId } }),
    ])

    return { id: productId }
}

export const createVariantForProduct = async (productId: number, data: {
    sku: string;
    version?: string;
    color?: string;
    color_hex?: string;
    price: number;
    compare_at_price?: number;
    stock: number;
    is_active?: boolean;
}, variantImagePublicId: string) => {
    const existingProduct = await prisma.products.findUnique({
        where: { id: productId },
        select: { id: true }
    })

    if (!existingProduct) {
        throw new Error('Sản phẩm không tồn tại')
    }

    try {
        const createdVariant = await prisma.$transaction(async (tx) => {
            const variant = await tx.productVariants.create({
                data: {
                    product_id: productId,
                    sku: data.sku,
                    version: data.version ?? null,
                    color: data.color ?? null,
                    color_hex: data.color_hex ?? null,
                    price: data.price,
                    compare_at_price: data.compare_at_price ?? null,
                    stock: data.stock,
                    is_active: data.is_active ?? true,
                }
            })

            await tx.productImages.create({
                data: {
                    product_id: productId,
                    variant_id: variant.id,
                    image_url: variantImagePublicId,
                    sort_order: 0,
                }
            })

            return variant
        })

        return createdVariant
    } catch (error: any) {
        const mappedError = mapVariantUniqueError(error)
        if (mappedError) {
            throw new Error(mappedError)
        }

        throw error
    }
}

export const updateVariant = async (variantId: number, data: {
    sku?: string;
    version?: string;
    color?: string;
    color_hex?: string;
    price?: number;
    compare_at_price?: number;
    stock?: number;
}, variantImagePublicId?: string) => {
    const existingVariant = await prisma.productVariants.findUnique({
        where: { id: variantId },
        select: { id: true, product_id: true }
    })

    if (!existingVariant) {
        throw new Error('Biến thể không tồn tại')
    }

    try {
        const updatedVariant = await prisma.productVariants.update({
            where: { id: variantId },
            data: {
                ...(data.sku !== undefined ? { sku: data.sku } : {}),
                ...(data.version !== undefined ? { version: data.version } : {}),
                ...(data.color !== undefined ? { color: data.color } : {}),
                ...(data.color_hex !== undefined ? { color_hex: data.color_hex } : {}),
                ...(data.price !== undefined ? { price: data.price } : {}),
                ...(data.compare_at_price !== undefined ? { compare_at_price: data.compare_at_price } : {}),
                ...(data.stock !== undefined ? { stock: data.stock } : {}),
            }
        })

        if (variantImagePublicId) {
            const existingImage = await prisma.productImages.findFirst({
                where: { variant_id: variantId },
                select: { id: true, image_url: true }
            })

            if (existingImage) {
                await prisma.productImages.update({
                    where: { id: existingImage.id },
                    data: { image_url: variantImagePublicId }
                })
                await deleteImageFromCloudinary(existingImage.image_url)
            } else {
                await prisma.productImages.create({
                    data: {
                        product_id: existingVariant.product_id,
                        variant_id: variantId,
                        image_url: variantImagePublicId,
                        sort_order: 0,
                    }
                })
            }
        }

        return updatedVariant
    } catch (error: any) {
        const mappedError = mapVariantUniqueError(error)
        if (mappedError) {
            throw new Error(mappedError)
        }

        throw error
    }
}

export const deleteVariant = async (variantId: number) => {
    const variant = await prisma.productVariants.findUnique({
        where: { id: variantId },
        select: {
            id: true,
            _count: {
                select: {
                    cart_items: true,
                    order_items: true,
                    reviews: true,
                }
            }
        }
    })

    if (!variant) {
        throw new Error('Biến thể không tồn tại')
    }

    if (variant._count.cart_items > 0 || variant._count.order_items > 0 || variant._count.reviews > 0) {
        throw new Error('Không thể xóa biến thể đang có đơn hàng, giỏ hàng hoặc đánh giá')
    }

    await prisma.$transaction([
        prisma.productImages.deleteMany({ where: { variant_id: variantId } }),
        prisma.stockLogs.deleteMany({ where: { variant_id: variantId } }),
        prisma.productVariants.delete({ where: { id: variantId } }),
    ])

    return { id: variantId }
}

export const updateVariantStatus = async (variantId: number, isActive: boolean) => {
    const existingVariant = await prisma.productVariants.findUnique({
        where: { id: variantId },
        select: { id: true }
    })

    if (!existingVariant) {
        throw new Error('Biến thể không tồn tại')
    }

    return prisma.productVariants.update({
        where: { id: variantId },
        data: { is_active: isActive }
    })
}

export const getProductVariants = async (productId: number) => {
    const product = await prisma.products.findUnique({
        where: { id: productId },
        select: { id: true }
    })

    if (!product) {
        throw new Error('Sản phẩm không tồn tại')
    }

    const variants = await prisma.productVariants.findMany({
        where: { product_id: productId },
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            sku: true,
            version: true,
            color: true,
            color_hex: true,
            price: true,
            compare_at_price: true,
            stock: true,
            is_active: true,
            created_at: true,
            updated_at: true,
            product_images: {
                orderBy: { id: 'asc' },
                take: 1,
                select: { image_url: true }
            }
        }
    })

    return variants.map(({ product_images, ...variant }) => ({
        ...variant,
        price: Number(variant.price),
        compare_at_price: variant.compare_at_price ? Number(variant.compare_at_price) : null,
        variant_image: product_images[0]?.image_url
            ? getCloudinaryImageUrl(product_images[0].image_url)
            : null,
    }))
}

export const getAdminProducts = async (filters: AdminProductListFilters) => {
    const { page, limit, keyword, categoryId, brandId, priceMin, priceMax, status } = filters

    const where: any = {}

    if (status) {
        where.status = status
    }

    if (keyword) {
        where.name = {
            contains: keyword,
            mode: 'insensitive',
        }
    }

    if (categoryId) {
        where.category_id = categoryId
    }

    if (brandId) {
        where.brand_id = brandId
    }

    if (priceMin !== undefined || priceMax !== undefined) {
        where.product_variants = {
            some: {
                price: {
                    ...(priceMin !== undefined ? { gte: priceMin } : {}),
                    ...(priceMax !== undefined ? { lte: priceMax } : {}),
                },
            },
        }
    }

    const [total, products] = await Promise.all([
        prisma.products.count({ where }),
        prisma.products.findMany({
            where,
            orderBy: { created_at: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                sku: true,
                name: true,
                slug: true,
                status: true,
                category: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                brand: {
                    select: {
                        id: true,
                        name: true,
                        logo_url: true,
                    },
                },
                product_images: {
                    orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
                    take: 1,
                    select: { image_url: true },
                },
                product_variants: {
                    select: { price: true },
                },
            },
        }),
    ])

    const items = products.map(mapAdminProductCard)
    const totalPages = Math.ceil(total / limit)

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            total_pages: totalPages,
        },
    }
}

export const addProductImages = async (productId: number, imagePublicIds: string[]) => {
    const product = await prisma.products.findUnique({
        where: { id: productId },
        select: { id: true }
    })

    if (!product) {
        throw new Error('Sản phẩm không tồn tại')
    }

    const existingCount = await prisma.productImages.count({
        where: { product_id: productId, variant_id: null }
    })

    if (existingCount + imagePublicIds.length > 8) {
        throw new Error('Mỗi sản phẩm chỉ được tối đa 8 ảnh')
    }

    const existingPrimary = await prisma.productImages.findFirst({
        where: { product_id: productId, variant_id: null, is_primary: true },
        select: { id: true }
    })

    const maxSort = await prisma.productImages.aggregate({
        where: { product_id: productId, variant_id: null },
        _max: { sort_order: true }
    })

    const startSort = (maxSort._max.sort_order ?? -1) + 1
    const shouldSetPrimary = !existingPrimary

    const imagesData = imagePublicIds.map((publicId, index) => ({
        product_id: productId,
        image_url: publicId,
        is_primary: shouldSetPrimary && index === 0,
        sort_order: startSort + index,
    }))

    if (imagesData.length > 0) {
        await prisma.productImages.createMany({ data: imagesData })
    }

    return { count: imagesData.length }
}

export const getProductImageRemainingSlots = async (productId: number) => {
    const product = await prisma.products.findUnique({
        where: { id: productId },
        select: { id: true }
    })

    if (!product) {
        throw new Error('Sản phẩm không tồn tại')
    }

    const existingCount = await prisma.productImages.count({
        where: { product_id: productId, variant_id: null }
    })

    return Math.max(0, 8 - existingCount)
}

export const deleteProductImage = async (imageId: number) => {
    const image = await prisma.productImages.findUnique({
        where: { id: imageId },
        select: { id: true, product_id: true, variant_id: true, is_primary: true }
    })

    if (!image) {
        throw new Error('Ảnh không tồn tại')
    }

    if (image.variant_id !== null) {
        throw new Error('Ảnh này thuộc biến thể, không thể xóa qua API ảnh sản phẩm')
    }

    await prisma.$transaction(async (tx) => {
        await tx.productImages.delete({ where: { id: imageId } })

        if (image.is_primary) {
            const nextImage = await tx.productImages.findFirst({
                where: { product_id: image.product_id, variant_id: null },
                orderBy: [{ is_primary: 'desc' }, { sort_order: 'asc' }],
                select: { id: true }
            })

            if (nextImage) {
                await tx.productImages.update({
                    where: { id: nextImage.id },
                    data: { is_primary: true }
                })
            }
        }
    })

    return { id: imageId }
}

export const setProductImagePrimary = async (imageId: number) => {
    const image = await prisma.productImages.findUnique({
        where: { id: imageId },
        select: { id: true, product_id: true, variant_id: true }
    })

    if (!image) {
        throw new Error('Ảnh không tồn tại')
    }

    if (image.variant_id !== null) {
        throw new Error('Ảnh này thuộc biến thể, không thể đặt làm ảnh chính của sản phẩm')
    }

    await prisma.$transaction([
        prisma.productImages.updateMany({
            where: { product_id: image.product_id, variant_id: null },
            data: { is_primary: false }
        }),
        prisma.productImages.update({
            where: { id: imageId },
            data: { is_primary: true }
        }),
    ])

    return { id: imageId }
}

export const updateVariantImage = async (variantId: number, imagePublicId: string) => {
    const variant = await prisma.productVariants.findUnique({
        where: { id: variantId },
        select: { id: true, product_id: true }
    })

    if (!variant) {
        throw new Error('Biến thể không tồn tại')
    }

    const existingImage = await prisma.productImages.findFirst({
        where: { variant_id: variantId },
        orderBy: { id: 'asc' },
        select: { id: true, image_url: true }
    })

    if (existingImage) {
        await prisma.productImages.update({
            where: { id: existingImage.id },
            data: { image_url: imagePublicId }
        })
        return { id: variantId, old_public_id: existingImage.image_url }
    } else {
        await prisma.productImages.create({
            data: {
                product_id: variant.product_id,
                variant_id: variantId,
                image_url: imagePublicId,
                sort_order: 0,
            }
        })
        return { id: variantId }
    }
}
