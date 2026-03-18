/*
  Warnings:

  - The values [SERVICIO] on the enum `AreaEspecialidad` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AreaEspecialidad_new" AS ENUM ('BIENES', 'OBRAS', 'SERVICIOS');
ALTER TABLE "Proveedor" ALTER COLUMN "areaEspecialidad" TYPE "AreaEspecialidad_new" USING ("areaEspecialidad"::text::"AreaEspecialidad_new");
ALTER TYPE "AreaEspecialidad" RENAME TO "AreaEspecialidad_old";
ALTER TYPE "AreaEspecialidad_new" RENAME TO "AreaEspecialidad";
DROP TYPE "AreaEspecialidad_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "tb_expediente_contratacion" DROP CONSTRAINT "tb_expediente_contratacion_id_autoridad_fkey";

-- DropForeignKey
ALTER TABLE "tb_expediente_contratacion" DROP CONSTRAINT "tb_expediente_contratacion_id_comision_fkey";

-- DropForeignKey
ALTER TABLE "tb_expediente_contratacion" DROP CONSTRAINT "tb_expediente_contratacion_id_unidad_usuaria_fkey";

-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN     "datosRegistroMercantil" TEXT,
ADD COLUMN     "fechaUltimaAprobacion" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tb_expediente_contratacion" ALTER COLUMN "id_comision" DROP NOT NULL,
ALTER COLUMN "id_unidad_usuaria" DROP NOT NULL,
ALTER COLUMN "id_autoridad" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_comision_fkey" FOREIGN KEY ("id_comision") REFERENCES "tb_comision_contrataciones"("id_comision") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_unidad_usuaria_fkey" FOREIGN KEY ("id_unidad_usuaria") REFERENCES "tb_unidad_usuaria"("id_unidad_usuaria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_autoridad_fkey" FOREIGN KEY ("id_autoridad") REFERENCES "tb_maxima_autoridad"("id_autoridad") ON DELETE SET NULL ON UPDATE CASCADE;
