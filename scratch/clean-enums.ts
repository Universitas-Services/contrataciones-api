import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpieza y actualización de tipos de documentos...');

  // 1. Cambiar los registros con REGISTRO_MERCANTIL a ACTA_CONSTITUTIVA de forma directa a través de una consulta nativa segura
  // Ya que en el esquema de Prisma aún no existe ACTA_CONSTITUTIVA a nivel de cliente hasta que no sincronicemos,
  // la mejor forma de hacerlo es mediante una consulta SQL pura ($executeRaw) que altera los valores de texto.

  console.log('Eliminando registros de ESTADOS_FINANCIEROS y REFERENCIAS_BANCARIAS...');
  const eliminados = await prisma.$executeRawUnsafe(
    `DELETE FROM "DocumentoProveedor" WHERE "tipoDocumento" IN ('ESTADOS_FINANCIEROS', 'REFERENCIAS_BANCARIAS')`,
  );
  console.log(`Registros eliminados: ${eliminados}`);

  // Como "ACTA_CONSTITUTIVA" no existe en el tipo ENUM de PostgreSQL aún, primero necesitamos agregarlo temporalmente al ENUM nativo.
  console.log('Agregando ACTA_CONSTITUTIVA al tipo enum en PostgreSQL...');
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "TipoDocumentoProveedor" ADD VALUE IF NOT EXISTS 'ACTA_CONSTITUTIVA'`,
    );
  } catch {
    console.log(
      'El valor ACTA_CONSTITUTIVA ya existía o el tipo se gestiona de otra forma. Continuando...',
    );
  }

  console.log('Actualizando REGISTRO_MERCANTIL a ACTA_CONSTITUTIVA...');
  const actualizados = await prisma.$executeRawUnsafe(
    `UPDATE "DocumentoProveedor" SET "tipoDocumento" = 'ACTA_CONSTITUTIVA' WHERE "tipoDocumento" = 'REGISTRO_MERCANTIL'`,
  );
  console.log(`Registros actualizados: ${actualizados}`);

  // Finalmente limpiamos cualquier referencia obsoleta de REGISTRO_MERCANTIL
  console.log('Eliminando registros restantes obsoletos de REGISTRO_MERCANTIL...');
  const eliminadosMercantil = await prisma.$executeRawUnsafe(
    `DELETE FROM "DocumentoProveedor" WHERE "tipoDocumento" = 'REGISTRO_MERCANTIL'`,
  );
  console.log(`Registros obsoletos eliminados: ${eliminadosMercantil}`);

  console.log('Limpieza completada exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
