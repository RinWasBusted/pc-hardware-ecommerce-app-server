# Cloudinary Setup Guide

## Environment Variables

Add the following variables to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Get these credentials from: https://cloudinary.com/console/settings/api-keys

## Usage Examples

### Single File Upload

```typescript
import { uploadSingle, uploadImageToCloudinary } from './utils/multer.js';
import { uploadImageToCloudinary } from './utils/cloudinary.js';

// In your route/controller
router.post('/upload', uploadSingle, async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		const result = await uploadImageToCloudinary(
			req.file.buffer,
			req.file.originalname,
			'folder/subfolder', // optional folder path
		);

		res.json({
			success: true,
			url: result.secure_url,
			publicId: result.public_id,
		});
	} catch (error: any) {
		res.status(400).json({ error: error.message });
	}
});
```

### Multiple Files Upload

```typescript
import { uploadArray } from './utils/multer.js';
import { uploadImagesToCloudinary } from './utils/cloudinary.js';

router.post('/upload-multiple', uploadArray, async (req, res) => {
	try {
		if (!req.files || req.files.length === 0) {
			return res.status(400).json({ error: 'No files uploaded' });
		}

		const results = await uploadImagesToCloudinary(
			req.files.map((f) => ({ buffer: f.buffer, originalname: f.originalname })),
		);

		res.json({ success: true, images: results });
	} catch (error: any) {
		res.status(400).json({ error: error.message });
	}
});
```

### Delete Image

```typescript
import { deleteImageFromCloudinary } from './utils/cloudinary.js';

await deleteImageFromCloudinary('folder/image-public-id');
```

### Generate Optimized Image URL

```typescript
import { getCloudinaryImageUrl } from './utils/cloudinary.js';

// Generate thumbnail
const thumbnailUrl = getCloudinaryImageUrl('folder/image-id', 200, 200, 'fill');

// Generate responsive image
const responsiveUrl = getCloudinaryImageUrl('folder/image-id', 800, 600, 'fit');
```

## Configuration Details

### Multer (src/utils/multer.ts)
- Uses **memory storage** (files stored in RAM temporarily)
- Max file size: 10MB
- Only accepts image files
- Exports: `uploadSingle`, `uploadArray`, `uploadFields`

### Cloudinary (src/utils/cloudinary.ts)
- Automatic image optimization
- Secure HTTPS URLs
- Support for image transformations (crop, resize, etc.)
- Batch upload/delete support
- Public ID management for easy tracking
