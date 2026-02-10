import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { IStorageService } from '../common/interfaces/storage-service.interface';

@Injectable()
export class CloudinaryService implements IStorageService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });
    }

    async uploadFile(file: Buffer, filePath: string): Promise<string> {
        // Parse folder and filename from filePath
        const pathParts = filePath.split('/');
        const filename = pathParts.pop() || 'file';
        const folder = pathParts.join('/');

        // Detect resource type based on file extension
        const extension = filename.split('.').pop()?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '');
        const resourceType = isImage ? 'image' : 'raw';

        return new Promise((resolve, reject) => {
            const uploadOptions: any = {
                folder: folder,
                public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension from public_id
                overwrite: true,
                resource_type: resourceType,
            };

            // Only add transformations for images
            if (isImage) {
                uploadOptions.transformation = [{ quality: 'auto', fetch_format: 'auto' }];
            }

            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) return reject(new Error('Error en subida a Cloudinary: Resultado vacío'));
                    resolve(result.secure_url);
                },
            );

            streamifier.createReadStream(file).pipe(uploadStream);
        });
    }

    async deleteFile(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            throw new InternalServerErrorException('Error eliminando imagen de Cloudinary');
        }
    }
}


