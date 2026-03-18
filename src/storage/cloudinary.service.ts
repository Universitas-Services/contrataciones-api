/* eslint-disable @typescript-eslint/no-unsafe-argument */
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

  async uploadFile(file: Buffer, folder: string, filename?: string): Promise<string> {
    // If filename is not provided, treat folder as full filePath for backward compatibility
    let resolvedFolder: string;
    let resolvedFilename: string;

    if (filename) {
      resolvedFolder = folder;
      resolvedFilename = filename;
    } else {
      // Parse folder and filename from filePath
      const pathParts = folder.split('/');
      resolvedFilename = pathParts.pop() || 'file';
      resolvedFolder = pathParts.join('/');
    }

    // Detect resource type based on file extension
    const extension = resolvedFilename.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '');
    const resourceType = isImage ? 'image' : 'auto';

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: resolvedFolder,
        public_id: resolvedFilename.replace(/\.[^/.]+$/, ''), // Remove extension from public_id
        overwrite: true,
        resource_type: resourceType,
      };

      // Only add transformations for images
      if (isImage) {
        uploadOptions.transformation = [{ quality: 'auto', fetch_format: 'auto' }];
      }

      const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) return reject(new Error(error.message || 'Error desconocido de Cloudinary'));
        if (!result) return reject(new Error('Error en subida a Cloudinary: Resultado vacío'));
        resolve(result.secure_url);
        return; // Explicit return for void
      });

      streamifier.createReadStream(file).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      throw new InternalServerErrorException('Error eliminando imagen de Cloudinary');
    }
  }
}
