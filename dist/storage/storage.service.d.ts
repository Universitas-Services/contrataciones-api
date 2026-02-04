export declare class StorageService {
    private readonly uploadDir;
    constructor();
    uploadFile(buffer: Buffer, filePath: string): Promise<string>;
    getFile(filePath: string): Promise<Buffer>;
    deleteFile(filePath: string): Promise<void>;
    fileExists(filePath: string): boolean;
}
