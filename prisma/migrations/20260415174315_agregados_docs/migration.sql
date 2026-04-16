/*
  Warnings:

  - The values [JURIDICA,TECNICA,FINANCIERA,ADMINISTRATIVA] on the enum `AreaRepresentacion` will be removed. If these variants are still used in the database, this will fail.
  - The values [TITULAR,SUPLENTE,COORDINADOR,SECRETARIO] on the enum `TipoMiembro` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `FasePreparatoria` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AreaRepresentacion_new" AS ENUM ('Área jurídica', 'Área técnica', 'Área económica-financiera', 'Secretario (a)');
ALTER TABLE "tb_miembro_comision" ALTER COLUMN "area_representacion" TYPE "AreaRepresentacion_new" USING ("area_representacion"::text::"AreaRepresentacion_new");
ALTER TYPE "AreaRepresentacion" RENAME TO "AreaRepresentacion_old";
ALTER TYPE "AreaRepresentacion_new" RENAME TO "AreaRepresentacion";
DROP TYPE "AreaRepresentacion_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoDocumento" ADD VALUE 'ACTA_INICIO';
ALTER TYPE "TipoDocumento" ADD VALUE 'LLAMADO_PARTICIPAR';

-- AlterEnum
BEGIN;
CREATE TYPE "TipoMiembro_new" AS ENUM ('Miembro principal', 'Miembro suplente', 'Coordinador (a)', 'Secretario (a)');
ALTER TABLE "tb_miembro_comision" ALTER COLUMN "tipo_miembro" TYPE "TipoMiembro_new" USING ("tipo_miembro"::text::"TipoMiembro_new");
ALTER TYPE "TipoMiembro" RENAME TO "TipoMiembro_old";
ALTER TYPE "TipoMiembro_new" RENAME TO "TipoMiembro";
DROP TYPE "TipoMiembro_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "FasePreparatoria" DROP CONSTRAINT "FasePreparatoria_expedienteId_fkey";

-- AlterTable
ALTER TABLE "tb_expediente_contratacion" ADD COLUMN     "ind_firma_delegado_au_au" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "FasePreparatoria";

-- CreateTable
CREATE TABLE "tb_fase_preparatoria" (
    "id_fase_preparatoria" TEXT NOT NULL,
    "id_expediente" TEXT NOT NULL,
    "datos_acto_autorizacion_inicio" VARCHAR(255),
    "fec_acta_inicio" TIMESTAMP(3),
    "detalles_tecnicos_calidad" TEXT,
    "alcance_cantidades_obra" TEXT,
    "justificacion_ventajas" TEXT,
    "ind_origen_crs_registro" BOOLEAN NOT NULL DEFAULT false,
    "dias_validez_oferta" INTEGER,
    "autoridad_aclaratorias" VARCHAR(255),
    "normativa_legal" TEXT,
    "dias_vigencia_garantia_ext" INTEGER,
    "objetivos_especificos_1" VARCHAR(255),
    "objetivos_especificos_2" VARCHAR(255),
    "objetivos_especificos_3" VARCHAR(255),
    "direccion_retiro_pliego" VARCHAR(255),
    "horario_retiro_pliego" VARCHAR(255),
    "pliego_gratuito" BOOLEAN NOT NULL DEFAULT true,
    "costo_pliego_bs" DECIMAL(10,2),
    "banco_pago_pliego" VARCHAR(100),
    "cuenta_pago_pliego" VARCHAR(50),
    "titular_pago_pliego" VARCHAR(100),
    "hora_acto_recep_aper" VARCHAR(50),
    "correo_comision" VARCHAR(100),
    "telefono_comision" VARCHAR(50),
    "condicion_plurianual" VARCHAR(255),
    "viabilidad_contrato_marco" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tb_fase_preparatoria_pkey" PRIMARY KEY ("id_fase_preparatoria")
);

-- CreateTable
CREATE TABLE "tb_presupuesto_items" (
    "id_presupuesto_item" TEXT NOT NULL,
    "id_expediente" TEXT NOT NULL,
    "descripcion_item" VARCHAR(255) NOT NULL,
    "codigo_partida" VARCHAR(50) NOT NULL,
    "unidad_medida" VARCHAR(50) NOT NULL,
    "cantidad_requerida" DECIMAL(10,2) NOT NULL,
    "precio_unitario_estimado" DECIMAL(15,2) NOT NULL,
    "total_item" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tb_presupuesto_items_pkey" PRIMARY KEY ("id_presupuesto_item")
);

-- CreateIndex
CREATE UNIQUE INDEX "tb_fase_preparatoria_id_expediente_key" ON "tb_fase_preparatoria"("id_expediente");

-- CreateIndex
CREATE INDEX "tb_fase_preparatoria_id_expediente_idx" ON "tb_fase_preparatoria"("id_expediente");

-- CreateIndex
CREATE INDEX "tb_presupuesto_items_id_expediente_idx" ON "tb_presupuesto_items"("id_expediente");

-- AddForeignKey
ALTER TABLE "tb_fase_preparatoria" ADD CONSTRAINT "tb_fase_preparatoria_id_expediente_fkey" FOREIGN KEY ("id_expediente") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_presupuesto_items" ADD CONSTRAINT "tb_presupuesto_items_id_expediente_fkey" FOREIGN KEY ("id_expediente") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;
