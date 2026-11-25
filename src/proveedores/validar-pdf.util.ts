import { BadRequestException } from '@nestjs/common';

type Archivos = Record<string, { originalname: string; buffer: Buffer }[] | undefined>;

/** Multer entrega el nombre en latin1: sin esto las tildes salen mal. */
export const nombreArchivo = (a: { originalname: string }) =>
  Buffer.from(a.originalname, 'latin1').toString('utf8');

/** 400 con los nombres de los archivos que no son PDF. Se llama antes de guardar nada. */
export function validarPdfs(archivos: Archivos | undefined): void {
  const invalidos = Object.values(archivos ?? {})
    .flatMap((lista) => lista ?? [])
    // La firma puede ir precedida de algunos bytes.
    .filter((a) => !a.buffer?.subarray(0, 1024).includes('%PDF-'))
    .map((a) => `«${nombreArchivo(a)}»`);
  if (invalidos.length) {
    throw new BadRequestException(
      `${invalidos.length === 1 ? 'Este archivo no es un PDF válido' : 'Estos archivos no son PDF válidos'}: ${invalidos.join(', ')}.`,
    );
  }
}
