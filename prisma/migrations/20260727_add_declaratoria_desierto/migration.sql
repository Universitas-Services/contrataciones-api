-- Agregar valor DESIERTO al enum EstatusProceso
ALTER TYPE "EstatusProceso" ADD VALUE 'DESIERTO';

-- Agregar campos de declaratoria de desierto a ExpedienteContratacion
ALTER TABLE "tb_expediente_contratacion"
  ADD COLUMN "declaratoria_desierto_au_au" BOOLEAN DEFAULT false,
  ADD COLUMN "causal_declaratoria_desierto_au_au" VARCHAR(255),
  ADD COLUMN "justificacion_declaratoria_desierto_au_au" TEXT;
