-- DropForeignKey
ALTER TABLE "tb_adquirente_pliego" DROP CONSTRAINT "tb_adquirente_pliego_id_proveedor_fkey";

-- AlterTable
ALTER TABLE "tb_adquirente_pliego" ALTER COLUMN "id_proveedor" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tb_adquirente_pliego" ADD CONSTRAINT "tb_adquirente_pliego_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
