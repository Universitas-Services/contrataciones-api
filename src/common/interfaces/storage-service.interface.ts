export interface IStorageService {
  /**
   * Sube un archivo al almacenamiento.
   * @param file El archivo a subir (Buffer).
   * @param folder Carpeta destino (ej: 'universitas/entes/uuid').
   * @param filename Nombre del archivo (sin extensión).
   * @returns La URL pública segura del archivo subido.
   */
  uploadFile(file: Buffer, folder: string, filename: string): Promise<string>;

  /**
   * Elimina un archivo del almacenamiento.
   * @param publicId El identificador público del archivo en el servicio.
   */
  deleteFile(publicId: string): Promise<void>;
}
