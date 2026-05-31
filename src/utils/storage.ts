import 'dotenv/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'node:path';
import toSlug from './slug.js';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || '',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

async function uploadToStorage (file: Express.Multer.File, folder:string = 'undefined'){
    try {
        const parsedFileName = path.parse(file.originalname);
        const slugifiedBaseName = toSlug(parsedFileName.name) || `file-${Date.now()}`;
        const normalizedFileName = `${slugifiedBaseName}${parsedFileName.ext}`;

        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME || '',
            Key: `${folder}/${Date.now()}_${normalizedFileName}`,
            Body: file.buffer,
            ContentType: file.mimetype,
        };
        
        await s3Client.send(new PutObjectCommand(uploadParams));

        const imageKey = uploadParams.Key;

        return imageKey;
    } catch (error) {
        throw new Error(`Failed to upload file: ${error}`);
    }
}

async function uploadManyToStorage (files: Express.Multer.File[], folder: string = 'undefined') {
    try {
        const imageKeys = await Promise.all(files.map((file) => uploadToStorage(file, folder)));

        return imageKeys;
    } catch (error) {
        throw new Error(`Failed to upload files: ${error}`);
    }
}

async function deleteFromStorage (key: string) {
    try {
        const deleteParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME || '',
            Key: key,
        };

        await s3Client.send(new DeleteObjectCommand(deleteParams));

        return true;
    } catch (error) {
        throw new Error(`Failed to delete file: ${error}`);
    }
}

async function deleteManyFromStorage (keys: string[]) {
    try {
        await Promise.all(keys.map((key) => deleteFromStorage(key)));
        return true;
    } catch (error) {
        throw new Error(`Failed to delete files: ${error}`);
    }
}

async function getStorageUrl(key: string) {
    if(!key) return null;

    const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME || '',
        Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 }); 

    return url;
}


export { uploadToStorage, uploadManyToStorage, deleteFromStorage, deleteManyFromStorage, getStorageUrl };
