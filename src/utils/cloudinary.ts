import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
	api_key: process.env.CLOUDINARY_API_KEY || '',
	api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export type UploadImageResult = {
	secure_url: string;
	public_id: string;
	width: number;
	height: number;
	format: string;
};

/**
 * Upload image file to Cloudinary
 * @param fileBuffer - File buffer from multer
 * @param fileName - Original file name
 * @param folder - Cloudinary folder path (optional)
 */
export const uploadImageToCloudinary = async (
	fileBuffer: Buffer,
	fileName: string,
	folder: string = 'pc-hardware-ecommerce',
): Promise<UploadImageResult> => {
	return new Promise((resolve, reject) => {
		const publicId = fileName.split('.')[0] || `image-${Date.now()}`;
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder,
				resource_type: 'auto',
				public_id: publicId,
			},
			(error, result) => {
				if (error) {
					reject(new Error(`Cloudinary upload failed: ${error.message}`));
				} else if (result) {
					resolve({
						secure_url: result.secure_url,
						public_id: result.public_id,
						width: result.width,
						height: result.height,
						format: result.format,
					});
				}
			},
		);

		uploadStream.end(fileBuffer);
	});
};

/**
 * Upload multiple images to Cloudinary
 * @param files - Array of file buffers from multer
 * @param folder - Cloudinary folder path (optional)
 */
export const uploadImagesToCloudinary = async (
	files: Array<{ buffer: Buffer; originalname: string }>,
	folder: string = 'pc-hardware-ecommerce',
): Promise<UploadImageResult[]> => {
	const uploadPromises = files.map((file) =>
		uploadImageToCloudinary(file.buffer, file.originalname, folder),
	);

	return Promise.all(uploadPromises);
};

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
	try {
		await cloudinary.uploader.destroy(publicId);
	} catch (error: any) {
		console.error(`Cloudinary delete failed: ${error.message}`);
		throw new Error(`Failed to delete image: ${error.message}`);
	}
};

/**
 * Delete multiple images from Cloudinary
 * @param publicIds - Array of public IDs to delete
 */
export const deleteImagesFromCloudinary = async (publicIds: string[]): Promise<void> => {
	const deletePromises = publicIds.map((publicId) =>
		deleteImageFromCloudinary(publicId),
	);

	await Promise.all(deletePromises);
};

/**
 * Generate Cloudinary URL with transformations
 * @param publicId - Public ID of the image
 * @param width - Image width
 * @param height - Image height
 * @param crop - Crop mode (fill, fit, etc.)
 */
export const getCloudinaryImageUrl = (
	publicId: string,
	width?: number,
	height?: number,
	crop: 'fill' | 'fit' | 'scale' | 'thumb' = 'fill',
): string => {
	return cloudinary.url(publicId, {
		secure: true,
		width,
		height,
		crop,
	});
};
