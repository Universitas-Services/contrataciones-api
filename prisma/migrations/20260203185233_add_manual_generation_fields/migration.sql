/*
  Warnings:

  - You are about to drop the column `fechaEmision` on the `ManualGenerado` table. All the data in the column will be lost.
  - You are about to drop the column `numeroVersion` on the `ManualGenerado` table. All the data in the column will be lost.
  - Added the required column `tipoManual` to the `ManualGenerado` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tituloManual` to the `ManualGenerado` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ManualGenerado_enteId_idx";

-- AlterTable
ALTER TABLE "ManualGenerado" DROP COLUMN "fechaEmision",
DROP COLUMN "numeroVersion",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "tipoManual" TEXT NOT NULL,
ADD COLUMN     "tituloManual" TEXT NOT NULL,
ADD COLUMN     "updatedBy" TEXT,
ADD COLUMN     "versionDocumento" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "ManualGenerado_enteId_tipoManual_idx" ON "ManualGenerado"("enteId", "tipoManual");

-- CreateIndex
CREATE INDEX "ManualGenerado_createdAt_idx" ON "ManualGenerado"("createdAt");
