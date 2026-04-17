/*
  Warnings:

  - You are about to drop the column `cedulaRepLegalActo` on the `OfertaPresentada` table. All the data in the column will be lost.
  - You are about to drop the column `datosRegistroMercantilTexto` on the `OfertaPresentada` table. All the data in the column will be lost.
  - You are about to drop the column `fechaPresentacion` on the `OfertaPresentada` table. All the data in the column will be lost.
  - You are about to drop the column `montoOfertaBs` on the `OfertaPresentada` table. All the data in the column will be lost.
  - You are about to drop the column `nombreRepLegalActo` on the `OfertaPresentada` table. All the data in the column will be lost.
  - You are about to drop the column `numeroSobresEntregados` on the `OfertaPresentada` table. All the data in the column will be lost.
  - You are about to drop the column `presentoGarantiaOferta` on the `OfertaPresentada` table. All the data in the column will be lost.
  - You are about to drop the column `correo_proveedor_adquiriente_au_au` on the `tb_adquirente_pliego` table. All the data in the column will be lost.
  - You are about to drop the column `direccion_fiscal_proveedor_adquiriente_au_au` on the `tb_adquirente_pliego` table. All the data in the column will be lost.
  - You are about to drop the column `nombre_contacto_retiro` on the `tb_adquirente_pliego` table. All the data in the column will be lost.
  - You are about to drop the column `telefono_proveedor_adquiriente_au_au` on the `tb_adquirente_pliego` table. All the data in the column will be lost.
  - Added the required column `cedula_rep_legal_oferente_au_au` to the `OfertaPresentada` table without a default value. This is not possible if the table is not empty.
  - Added the required column `monto_oferta_bs_au_au` to the `OfertaPresentada` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre_proveedor_oferente_au_au` to the `OfertaPresentada` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre_rep_legal_oferente_au_au` to the `OfertaPresentada` table without a default value. This is not possible if the table is not empty.
  - Added the required column `num_sobres_entregados_au_au` to the `OfertaPresentada` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rif_proveedor_oferente_au_au` to the `OfertaPresentada` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correo_proveedor_adquirente_au_au` to the `tb_adquirente_pliego` table without a default value. This is not possible if the table is not empty.
  - Added the required column `direccion_fiscal_proveedor_adquirente_au_au` to the `tb_adquirente_pliego` table without a default value. This is not possible if the table is not empty.
  - Added the required column `telefono_proveedor_adquirente_au_au` to the `tb_adquirente_pliego` table without a default value. This is not possible if the table is not empty.
  - Made the column `nombre_proveedor_adquiriente_au_au` on table `tb_adquirente_pliego` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "TipoDocumento" ADD VALUE 'REGISTRO_ADQUIRENTES';

-- DropForeignKey
ALTER TABLE "OfertaPresentada" DROP CONSTRAINT "OfertaPresentada_proveedorId_fkey";

-- AlterTable
ALTER TABLE "OfertaPresentada" DROP COLUMN "cedulaRepLegalActo",
DROP COLUMN "datosRegistroMercantilTexto",
DROP COLUMN "fechaPresentacion",
DROP COLUMN "montoOfertaBs",
DROP COLUMN "nombreRepLegalActo",
DROP COLUMN "numeroSobresEntregados",
DROP COLUMN "presentoGarantiaOferta",
ADD COLUMN     "cedula_rep_legal_oferente_au_au" VARCHAR(20) NOT NULL,
ADD COLUMN     "datos_registro_mercantil_proveedor_oferente_au_au" TEXT,
ADD COLUMN     "monto_oferta_bs_au_au" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "nombre_proveedor_oferente_au_au" VARCHAR(255) NOT NULL,
ADD COLUMN     "nombre_rep_legal_oferente_au_au" VARCHAR(255) NOT NULL,
ADD COLUMN     "num_sobres_entregados_au_au" INTEGER NOT NULL,
ADD COLUMN     "rif_proveedor_oferente_au_au" VARCHAR(20) NOT NULL,
ALTER COLUMN "proveedorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tb_adquirente_pliego" DROP COLUMN "correo_proveedor_adquiriente_au_au",
DROP COLUMN "direccion_fiscal_proveedor_adquiriente_au_au",
DROP COLUMN "nombre_contacto_retiro",
DROP COLUMN "telefono_proveedor_adquiriente_au_au",
ADD COLUMN     "correo_proveedor_adquirente_au_au" VARCHAR(100) NOT NULL,
ADD COLUMN     "direccion_fiscal_proveedor_adquirente_au_au" VARCHAR(255) NOT NULL,
ADD COLUMN     "telefono_proveedor_adquirente_au_au" VARCHAR(100) NOT NULL,
ALTER COLUMN "nombre_proveedor_adquiriente_au_au" SET NOT NULL,
ALTER COLUMN "nombre_proveedor_adquiriente_au_au" SET DATA TYPE VARCHAR(255);

-- AddForeignKey
ALTER TABLE "OfertaPresentada" ADD CONSTRAINT "OfertaPresentada_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
