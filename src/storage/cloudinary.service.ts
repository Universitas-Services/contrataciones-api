/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageService } from '../common/interfaces/storage-service.interface';

@Injectable()
export class CloudinaryService implements IStorageService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly useLocalFallback: boolean;
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    this.useLocalFallback = !cloudName || !apiKey || !apiSecret;

    if (this.useLocalFallback) {
      this.logger.warn(
        'Cloudinary no configurado — usando almacenamiento local en /uploads (solo desarrollo)',
      );
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } else {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
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

    if (this.useLocalFallback) {
      const relativePath = path.join(resolvedFolder, resolvedFilename).replace(/\\/g, '/');
      const fullPath = path.join(this.uploadDir, relativePath);
      const directory = path.dirname(fullPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      fs.writeFileSync(fullPath, file);
      return `/uploads/${relativePath}`;
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
    if (this.useLocalFallback) {
      const relative = publicId.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.uploadDir, relative);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch {
      throw new InternalServerErrorException('Error eliminando imagen de Cloudinary');
    }
  }
}
