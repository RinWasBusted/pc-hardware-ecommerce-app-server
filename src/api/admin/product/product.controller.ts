import type { Request, Response } from 'express';
import { ProductStatus } from '@prisma/client';
import { deleteImageFromCloudinary, uploadImageToCloudinary, uploadImagesToCloudinary } from '../../../utils/cloudinary.js';
import * as productService from './product.service.js';
import toSlug from '../../../utils/slug.js';

export const getAdminProducts = async (req: Request, res: Response) => {
    try {
        const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
        const limitInput = parseInt(req.query.limit as string, 10) || 20;
        const limit = Math.min(Math.max(limitInput, 1), 50);

        const keywordRaw = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
        const keyword = keywordRaw.length > 0 ? keywordRaw : undefined;

        const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined;
        const brandId = req.query.brand_id ? Number(req.query.brand_id) : undefined;
        const priceMin = req.query.price_min ? Number(req.query.price_min) : undefined;
        const priceMax = req.query.price_max ? Number(req.query.price_max) : undefined;
        const status = req.query.status as ProductStatus | undefined;

        if ((categoryId !== undefined && Number.isNaN(categoryId))
            || (brandId !== undefined && Number.isNaN(brandId))
            || (priceMin !== undefined && Number.isNaN(priceMin))
            || (priceMax !== undefined && Number.isNaN(priceMax))) {
            return res.status(400).json({
                success: false,
                message: 'Tham số lọc không hợp lệ'
            });
        }

        if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
            return res.status(400).json({
                success: false,
                message: 'Khoảng giá không hợp lệ'
            });
        }

        if (status && Object.keys(ProductStatus).indexOf(status) === -1) {
            return res.status(400).json({
                success: false,
                message: 'Trường status không hợp lệ'
            });
        }

        const result = await productService.getAdminProducts({
            page,
            limit,
            ...(keyword && { keyword }),
            ...(categoryId !== undefined && { categoryId }),
            ...(brandId !== undefined && { brandId }),
            ...(priceMin !== undefined && { priceMin }),
            ...(priceMax !== undefined && { priceMax }),
            ...(status && { status }),
        });

        return res.status(200).json({
            success: true,
            data: result.items,
            pagination: result.pagination,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { sku, name, description, category_id, brand_id, specifications, status, variants } = req.body;

        const parseJsonField = (value: string, fieldName: string) => {
            try {
                return JSON.parse(value);
            } catch {
                throw new Error(`Trường ${fieldName} phải là JSON hợp lệ`);
            }
        };

        const parsedCategoryId = Number(category_id);
        const parsedBrandId = Number(brand_id);

        const parsedSpecifications = typeof specifications === 'string'
            ? (specifications.trim().length > 0 ? parseJsonField(specifications, 'specifications') : undefined)
            : specifications;

        const parsedVariants = typeof variants === 'string'
            ? (variants.trim().length > 0 ? parseJsonField(variants, 'variants') : undefined)
            : variants;

        if (!sku || !name || Number.isNaN(parsedCategoryId) || Number.isNaN(parsedBrandId) || !Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu dữ liệu bắt buộc: sku, name, category_id, brand_id, variants'
            });
        }

        if (status && Object.keys(ProductStatus).indexOf(status) === -1) {
            return res.status(400).json({
                success: false,
                message: 'Trường status không hợp lệ'
            })
        }

        const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
        const productImageFiles = files.filter((file) => file.fieldname === 'product_images');

        if (productImageFiles.length > 8) {
            return res.status(400).json({
                success: false,
                message: 'Mỗi sản phẩm chỉ được tối đa 8 ảnh'
            });
        }

        const variantImageFilesByIndex: Array<Express.Multer.File | undefined> = new Array(parsedVariants.length);
        const sequentialVariantImageFiles: Express.Multer.File[] = [];
        const invalidVariantImageFields: string[] = [];

        for (const file of files) {
            if (file.fieldname === 'variant_images' || file.fieldname === 'variant_image') {
                sequentialVariantImageFiles.push(file);
                continue;
            }

            const match = file.fieldname.match(/^variants\[(\d+)\]\[variant_image\]$/)
                ?? file.fieldname.match(/^variants\[(\d+)\]\.variant_image$/)
                ?? file.fieldname.match(/^variants\.(\d+)\.variant_image$/);

            if (match) {
                const index = Number(match[1]);
                if (Number.isNaN(index) || index < 0 || index >= parsedVariants.length) {
                    invalidVariantImageFields.push(file.fieldname);
                    continue;
                }

                variantImageFilesByIndex[index] = file;
            }
        }

        if (invalidVariantImageFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ảnh biến thể không khớp với danh sách variants'
            });
        }

        let sequentialIndex = 0;
        for (let i = 0; i < parsedVariants.length; i += 1) {
            if (!variantImageFilesByIndex[i] && sequentialIndex < sequentialVariantImageFiles.length) {
                variantImageFilesByIndex[i] = sequentialVariantImageFiles[sequentialIndex];
                sequentialIndex += 1;
            }
        }

        if (sequentialIndex < sequentialVariantImageFiles.length) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng ảnh biến thể vượt quá số lượng variants'
            });
        }

        if (variantImageFilesByIndex.some((file) => !file)) {
            return res.status(400).json({
                success: false,
                message: 'Mỗi biến thể phải có đúng 1 ảnh'
            });
        }

        const slug = toSlug(name)

        const [productImageUploads, variantImageUploads] = await Promise.all([
            Promise.all(
                productImageFiles.map((file) =>
                    uploadImageToCloudinary(
                        file.buffer,
                        file.originalname,
                        'pc-hardware-ecommerce/products',
                    ),
                ),
            ),
            Promise.all(
                variantImageFilesByIndex.map((file) =>
                    uploadImageToCloudinary(
                        file!.buffer,
                        file!.originalname,
                        'pc-hardware-ecommerce/products/variants',
                    ),
                ),
            ),
        ]);

        const response = await productService.createProduct(
            sku,
            name,
            slug,
            description,
            parsedCategoryId,
            parsedBrandId,
            parsedSpecifications,
            status,
            parsedVariants,
            productImageUploads.map((item) => item.public_id),
            variantImageUploads.map((item) => item.public_id),
        );

        return res.status(201).json({
            success: true,
            data: response,
            message: 'Tạo sản phẩm thành công'
        })

    } catch (error: any){
        return res.status(400).json({
            success: false,
            message: error.message
        })
    }
}

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string, 10);
        const { sku, name, description, category_id, brand_id, specifications } = req.body;

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID sản phẩm không hợp lệ'
            });
        }

        const parseJsonField = (value: string, fieldName: string) => {
            try {
                return JSON.parse(value);
            } catch {
                throw new Error(`Trường ${fieldName} phải là JSON hợp lệ`);
            }
        };

        const parsedCategoryId = category_id !== undefined ? Number(category_id) : undefined;
        const parsedBrandId = brand_id !== undefined ? Number(brand_id) : undefined;
        const parsedSpecifications = typeof specifications === 'string'
            ? (specifications.trim().length > 0 ? parseJsonField(specifications, 'specifications') : undefined)
            : specifications;

        if ((parsedCategoryId !== undefined && Number.isNaN(parsedCategoryId))
            || (parsedBrandId !== undefined && Number.isNaN(parsedBrandId))) {
            return res.status(400).json({
                success: false,
                message: 'category_id hoặc brand_id không hợp lệ'
            });
        }

        if (!sku && !name && description === undefined && parsedCategoryId === undefined && parsedBrandId === undefined && parsedSpecifications === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu để cập nhật'
            });
        }

        const slug = name ? toSlug(name) : undefined;

        const updatePayload: {
            sku?: string;
            name?: string;
            slug?: string;
            description?: string | null;
            category_id?: number;
            brand_id?: number;
            specifications?: object | null;
        } = {};

        if (sku !== undefined) updatePayload.sku = sku;
        if (name !== undefined) updatePayload.name = name;
        if (slug !== undefined) updatePayload.slug = slug;
        if (description !== undefined) updatePayload.description = description;
        if (parsedCategoryId !== undefined) updatePayload.category_id = parsedCategoryId;
        if (parsedBrandId !== undefined) updatePayload.brand_id = parsedBrandId;
        if (parsedSpecifications !== undefined) updatePayload.specifications = parsedSpecifications;

        const response = await productService.updateProductInfo(productId, updatePayload);

        return res.status(200).json({
            success: true,
            data: response,
            message: 'Cập nhật sản phẩm thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string, 10);

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID sản phẩm không hợp lệ'
            });
        }

        const response = await productService.deleteProduct(productId);

        return res.status(200).json({
            success: true,
            data: response,
            message: 'Xóa sản phẩm thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateProductStatus = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string, 10);
        const { status } = req.body;

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID sản phẩm không hợp lệ'
            });
        }

        if (!status || Object.keys(ProductStatus).indexOf(status) === -1) {
            return res.status(400).json({
                success: false,
                message: 'Trường status không hợp lệ'
            });
        }

        const response = await productService.updateProductStatus(productId, status);

        return res.status(200).json({
            success: true,
            data: response,
            message: 'Cập nhật trạng thái sản phẩm thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const createVariantForProduct = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string, 10);
        const { sku, version, color, color_hex, price, compare_at_price, stock, is_active } = req.body;

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID sản phẩm không hợp lệ'
            });
        }

        const parsedPrice = Number(price);
        const parsedCompareAtPrice = compare_at_price !== undefined && compare_at_price !== null && String(compare_at_price).trim().length > 0
            ? Number(compare_at_price)
            : undefined;
        const parsedStock = Number(stock);
        const parsedIsActive = typeof is_active === 'boolean'
            ? is_active
            : (typeof is_active === 'string' ? is_active === 'true' : undefined);

        if (!sku || Number.isNaN(parsedPrice) || Number.isNaN(parsedStock)) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu dữ liệu bắt buộc: sku, price, stock'
            });
        }

        if (req.file === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Trường variant_image là bắt buộc'
            });
        }

        if (parsedCompareAtPrice !== undefined && Number.isNaN(parsedCompareAtPrice)) {
            return res.status(400).json({
                success: false,
                message: 'compare_at_price không hợp lệ'
            });
        }

        const uploadResult = await uploadImageToCloudinary(
            req.file.buffer,
            req.file.originalname,
            'pc-hardware-ecommerce/products/variants',
        );

        const variantPayload: {
            sku: string;
            version?: string;
            color?: string;
            color_hex?: string;
            price: number;
            compare_at_price?: number;
            stock: number;
            is_active?: boolean;
        } = {
            sku,
            price: parsedPrice,
            stock: parsedStock,
        };

        if (version !== undefined) variantPayload.version = version;
        if (color !== undefined) variantPayload.color = color;
        if (color_hex !== undefined) variantPayload.color_hex = color_hex;
        if (parsedCompareAtPrice !== undefined) variantPayload.compare_at_price = parsedCompareAtPrice;
        if (parsedIsActive !== undefined) variantPayload.is_active = parsedIsActive;

        const response = await productService.createVariantForProduct(productId, variantPayload, uploadResult.public_id);

        return res.status(201).json({
            success: true,
            data: response,
            message: 'Thêm biến thể thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateVariant = async (req: Request, res: Response) => {
    try {
        const variantId = parseInt(req.params.id as string, 10);
        const { sku, version, color, color_hex, price, compare_at_price, stock } = req.body;

        if (Number.isNaN(variantId)) {
            return res.status(400).json({
                success: false,
                message: 'ID biến thể không hợp lệ'
            });
        }

        const parsedPrice = price !== undefined ? Number(price) : undefined;
        const parsedCompareAtPrice = compare_at_price !== undefined && compare_at_price !== null && String(compare_at_price).trim().length > 0
            ? Number(compare_at_price)
            : undefined;
        const parsedStock = stock !== undefined ? Number(stock) : undefined;

        if ((parsedPrice !== undefined && Number.isNaN(parsedPrice))
            || (parsedStock !== undefined && Number.isNaN(parsedStock))
            || (parsedCompareAtPrice !== undefined && Number.isNaN(parsedCompareAtPrice))) {
            return res.status(400).json({
                success: false,
                message: 'Giá hoặc tồn kho không hợp lệ'
            });
        }

        if (!sku && !version && !color && !color_hex && parsedPrice === undefined && parsedCompareAtPrice === undefined && parsedStock === undefined && !req.file) {
            return res.status(400).json({
                success: false,
                message: 'Không có dữ liệu để cập nhật'
            });
        }

        const variantImagePublicId = req.file
            ? (await uploadImageToCloudinary(
                req.file.buffer,
                req.file.originalname,
                'pc-hardware-ecommerce/products/variants',
            )).public_id
            : undefined;

        const variantPayload: {
            sku?: string;
            version?: string;
            color?: string;
            color_hex?: string;
            price?: number;
            compare_at_price?: number;
            stock?: number;
        } = {};

        if (sku !== undefined) variantPayload.sku = sku;
        if (version !== undefined) variantPayload.version = version;
        if (color !== undefined) variantPayload.color = color;
        if (color_hex !== undefined) variantPayload.color_hex = color_hex;
        if (parsedPrice !== undefined) variantPayload.price = parsedPrice;
        if (parsedCompareAtPrice !== undefined) variantPayload.compare_at_price = parsedCompareAtPrice;
        if (parsedStock !== undefined) variantPayload.stock = parsedStock;

        const response = await productService.updateVariant(variantId, variantPayload, variantImagePublicId);

        return res.status(200).json({
            success: true,
            data: response,
            message: 'Cập nhật biến thể thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteVariant = async (req: Request, res: Response) => {
    try {
        const variantId = parseInt(req.params.id as string, 10);

        if (Number.isNaN(variantId)) {
            return res.status(400).json({
                success: false,
                message: 'ID biến thể không hợp lệ'
            });
        }

        const response = await productService.deleteVariant(variantId);

        return res.status(200).json({
            success: true,
            data: response,
            message: 'Xóa biến thể thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateVariantStatus = async (req: Request, res: Response) => {
    try {
        const variantId = parseInt(req.params.id as string, 10);
        const { is_active } = req.body;

        if (Number.isNaN(variantId)) {
            return res.status(400).json({
                success: false,
                message: 'ID biến thể không hợp lệ'
            });
        }

        const parsedIsActive = typeof is_active === 'boolean'
            ? is_active
            : (typeof is_active === 'string' ? is_active === 'true' : undefined);

        if (parsedIsActive === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Trường is_active không hợp lệ'
            });
        }

        const response = await productService.updateVariantStatus(variantId, parsedIsActive);

        return res.status(200).json({
            success: true,
            data: response,
            message: 'Cập nhật trạng thái biến thể thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const getProductVariants = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string, 10);

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID sản phẩm không hợp lệ'
            });
        }

        const variants = await productService.getProductVariants(productId);

        return res.status(200).json({
            success: true,
            data: variants
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const uploadProductImages = async (req: Request, res: Response) => {
    try {
        const productId = parseInt(req.params.id as string, 10);

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID sản phẩm không hợp lệ'
            });
        }

        const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];

        if (files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Trường images là bắt buộc'
            });
        }

        const remainingSlots = await productService.getProductImageRemainingSlots(productId);

        if (files.length > remainingSlots) {
            return res.status(400).json({
                success: false,
                message: 'Mỗi sản phẩm chỉ được tối đa 8 ảnh'
            });
        }

        const uploadResults = await uploadImagesToCloudinary(
            files.map((file) => ({ buffer: file.buffer, originalname: file.originalname })),
            'pc-hardware-ecommerce/products',
        );

        const response = await productService.addProductImages(
            productId,
            uploadResults.map((item) => item.public_id),
        );

        return res.status(201).json({
            success: true,
            data: response,
            message: 'Tải ảnh sản phẩm thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteProductImage = async (req: Request, res: Response) => {
    try {
        const imageId = parseInt(req.params.id as string, 10);

        if (Number.isNaN(imageId)) {
            return res.status(400).json({
                success: false,
                message: 'ID ảnh không hợp lệ'
            });
        }

        const response = await productService.deleteProductImage(imageId);

        return res.status(200).json({
            success: true,
            data: response,
            message: 'Xóa ảnh sản phẩm thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const setProductImagePrimary = async (req: Request, res: Response) => {
    try {
        const imageId = parseInt(req.params.id as string, 10);

        if (Number.isNaN(imageId)) {
            return res.status(400).json({
                success: false,
                message: 'ID ảnh không hợp lệ'
            });
        }

        const response = await productService.setProductImagePrimary(imageId);

        return res.status(200).json({
            success: true,
            data: response,
            message: 'Đặt ảnh chính thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateVariantImage = async (req: Request, res: Response) => {
    try {
        const variantId = parseInt(req.params.id as string, 10);

        if (Number.isNaN(variantId)) {
            return res.status(400).json({
                success: false,
                message: 'ID biến thể không hợp lệ'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Trường variant_image là bắt buộc'
            });
        }

        const uploadResult = await uploadImageToCloudinary(
            req.file.buffer,
            req.file.originalname,
            'pc-hardware-ecommerce/products/variants',
        );

        const response = await productService.updateVariantImage(variantId, uploadResult.public_id);

        if (response?.old_public_id) {
            await deleteImageFromCloudinary(response.old_public_id);
        }

        return res.status(200).json({
            success: true,
            data: response,
            message: 'Cập nhật ảnh biến thể thành công'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
