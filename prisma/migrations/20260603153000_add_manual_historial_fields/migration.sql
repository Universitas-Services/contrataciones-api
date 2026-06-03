-- AlterTable
ALTER TABLE "ManualGenerado" ADD COLUMN     "esVersionVigente" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "estaDesactualizado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motivoDesactualizacion" TEXT,
ADD COLUMN     "snapshotDatos" JSONB;

-- CreateIndex
CREATE INDEX "ManualGenerado_enteId_esVersionVigente_idx" ON "ManualGenerado"("enteId", "esVersionVigente");
