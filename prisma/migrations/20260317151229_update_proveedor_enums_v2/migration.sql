/*
  Warnings:

  - The values [SERVICIOS,CONSULTORIA] on the enum `AreaEspecialidad` will be removed. If these variants are still used in the database, this will fail.
  - The values [BASICO,INTERMEDIO,AVANZADO,EXPERTO] on the enum `NivelContratacion` will be removed. If these variants are still used in the database, this will fail.
  - The values [EMPRESA_PRIVADA,CONSORCIO] on the enum `TipoEntidadJuridica` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AreaEspecialidad_new" AS ENUM ('BIENES', 'OBRAS', 'SERVICIO');
ALTER TABLE "Proveedor" ALTER COLUMN "areaEspecialidad" TYPE "AreaEspecialidad_new" USING ("areaEspecialidad"::text::"AreaEspecialidad_new");
ALTER TYPE "AreaEspecialidad" RENAME TO "AreaEspecialidad_old";
ALTER TYPE "AreaEspecialidad_new" RENAME TO "AreaEspecialidad";
DROP TYPE "AreaEspecialidad_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NivelContratacion_new" AS ENUM ('ALTA', 'MEDIA', 'BAJA');
ALTER TABLE "Proveedor" ALTER COLUMN "nivelContratacion" TYPE "NivelContratacion_new" USING ("nivelContratacion"::text::"NivelContratacion_new");
ALTER TYPE "NivelContratacion" RENAME TO "NivelContratacion_old";
ALTER TYPE "NivelContratacion_new" RENAME TO "NivelContratacion";
DROP TYPE "NivelContratacion_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TipoEntidadJuridica_new" AS ENUM ('COMPANIA_ANONIMA', 'ASOCIACION_CIVIL', 'SRL', 'FUNDACION', 'COOPERATIVA', 'PYME');
ALTER TABLE "Proveedor" ALTER COLUMN "tipoEntidadJuridica" TYPE "TipoEntidadJuridica_new" USING ("tipoEntidadJuridica"::text::"TipoEntidadJuridica_new");
ALTER TYPE "TipoEntidadJuridica" RENAME TO "TipoEntidadJuridica_old";
ALTER TYPE "TipoEntidadJuridica_new" RENAME TO "TipoEntidadJuridica";
DROP TYPE "TipoEntidadJuridica_old";
COMMIT;
