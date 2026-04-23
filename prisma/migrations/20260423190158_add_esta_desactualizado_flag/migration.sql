-- AlterTable
ALTER TABLE "DocumentoGenerado" ADD COLUMN     "estaDesactualizado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tb_pliego_generado" ADD COLUMN     "estaDesactualizado" BOOLEAN NOT NULL DEFAULT false;
