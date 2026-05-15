import 'dotenv/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || '',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

async function uploadToStorage (file: Express.Multer.File, folder:string = 'undefined'){
    try {
        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME || '',
            Key: `${folder}/${Date.now()}_${file.originalname}`,
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

async function getStorageUrl(key: string) {
    if(!key) return null;

    const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME || '',
        Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 }); 

    return url;
}


export { uploadToStorage, deleteFromStorage, getStorageUrl };