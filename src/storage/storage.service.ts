import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
    private readonly uploadDir = path.join(process.cwd(), 'uploads');

    constructor() {
        // Crear directorio uploads si no existe
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async uploadFile(buffer: Buffer, filePath: string): Promise<string> {
        const fullPath = path.join(this.uploadDir, filePath);
        const directory = path.dirname(fullPath);

        // Crear directorios necesarios
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        // Guardar archivo
        fs.writeFileSync(fullPath, buffer);

        // Retornar URL pública relativa
        return `/uploads/${filePath}`;
    }

    async getFile(filePath: string): Promise<Buffer> {
        const fullPath = path.join(this.uploadDir, filePath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Archivo no encontrado: ${filePath}`);
        }

        return fs.readFileSync(fullPath);
    }

    async deleteFile(filePath: string): Promise<void> {
        const fullPath = path.join(this.uploadDir, filePath);

        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }
    }

    fileExists(filePath: string): boolean {
        const fullPath = path.join(this.uploadDir, filePath);
        return fs.existsSync(fullPath);
    }
}
