-- AlterEnum
ALTER TYPE "ModalidadSeleccion" ADD VALUE 'MODALIDADES_EXCLUIDAS';

-- AlterTable
ALTER TABLE "tb_cronograma_expediente" ADD COLUMN     "fec_verificacion_recaudos" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tb_expediente_contratacion" ADD COLUMN     "causal_procedencia_cd" TEXT,
ADD COLUMN     "id_unidad_contratante" TEXT,
ADD COLUMN     "modalidad_concurso_abierto" VARCHAR(100),
ADD COLUMN     "numeral_causal_procedencia_cd" VARCHAR(10);

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_unidad_contratante_fkey" FOREIGN KEY ("id_unidad_contratante") REFERENCES "tb_unidad_contratante"("id_unidad_contratante") ON DELETE SET NULL ON UPDATE CASCADE;
