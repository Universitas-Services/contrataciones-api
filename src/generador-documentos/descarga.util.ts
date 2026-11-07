import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import type { Response } from 'express';

/**
 * Envía un `.docx` guardado al navegador, sirviendo de proxy para que el
 * frontend no dependa de la URL del almacenamiento.
 */
export async function enviarDocumentoDocx(
  result: { url: string; fileName: string },
  res: Response,
): Promise<void> {
  try {
    let fileBuffer: Buffer;

    // Desarrollo local: archivo en /uploads/...
    if (result.url.startsWith('/uploads/')) {
      const relative = result.url.replace(/^\/uploads\//, '');
      const fullPath = path.join(process.cwd(), 'uploads', relative);
      if (!fs.existsSync(fullPath)) {
        res.status(404).json({
          statusCode: 404,
          message: `Archivo local no encontrado: ${result.url}`,
        });
        return;
      }
      fileBuffer = fs.readFileSync(fullPath);
    } else {
      const response = await axios.get<ArrayBuffer>(result.url, {
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      fileBuffer = Buffer.from(response.data);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache');

    res.end(fileBuffer);
  } catch (error: unknown) {
    res.status(500).json({
      statusCode: 500,
      message: 'Error al descargar el archivo',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
