/*
  Warnings:

  - You are about to drop the `AdquirentePliego` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AdquirentePliego" DROP CONSTRAINT "AdquirentePliego_expedienteId_fkey";

-- DropForeignKey
ALTER TABLE "AdquirentePliego" DROP CONSTRAINT "AdquirentePliego_proveedorId_fkey";

-- DropTable
DROP TABLE "AdquirentePliego";

-- CreateTable
CREATE TABLE "tb_adquirente_pliego" (
    "id_adquirente_au_au" TEXT NOT NULL,
    "id_expediente_au_au" TEXT NOT NULL,
    "id_proveedor" TEXT NOT NULL,
    "fec_adquisicion_pliego_au_au" TIMESTAMP(3) NOT NULL,
    "nombre_contacto_retiro" TEXT NOT NULL,
    "datos_pago_pliego_au_au" VARCHAR(255),
    "nombre_proveedor_adquiriente_au_au" VARCHAR(100),
    "direccion_fiscal_proveedor_adquiriente_au_au" VARCHAR(100),
    "telefono_proveedor_adquiriente_au_au" VARCHAR(100),
    "correo_proveedor_adquiriente_au_au" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_adquirente_pliego_pkey" PRIMARY KEY ("id_adquirente_au_au")
);

-- CreateTable
CREATE TABLE "tb_pliego_generado" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "tituloPliego" TEXT NOT NULL,
    "descripcion" TEXT,
    "urlArchivo" TEXT NOT NULL,
    "versionDocumento" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_pliego_generado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tb_adquirente_pliego_id_expediente_au_au_idx" ON "tb_adquirente_pliego"("id_expediente_au_au");

-- CreateIndex
CREATE INDEX "tb_adquirente_pliego_id_proveedor_idx" ON "tb_adquirente_pliego"("id_proveedor");

-- CreateIndex
CREATE INDEX "tb_pliego_generado_enteId_idx" ON "tb_pliego_generado"("enteId");

-- CreateIndex
CREATE INDEX "tb_pliego_generado_expedienteId_idx" ON "tb_pliego_generado"("expedienteId");

-- AddForeignKey
ALTER TABLE "tb_adquirente_pliego" ADD CONSTRAINT "tb_adquirente_pliego_id_expediente_au_au_fkey" FOREIGN KEY ("id_expediente_au_au") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_adquirente_pliego" ADD CONSTRAINT "tb_adquirente_pliego_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_pliego_generado" ADD CONSTRAINT "tb_pliego_generado_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_pliego_generado" ADD CONSTRAINT "tb_pliego_generado_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE RESTRICT ON UPDATE CASCADE;
