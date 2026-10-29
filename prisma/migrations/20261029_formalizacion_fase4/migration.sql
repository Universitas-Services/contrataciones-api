-- Fase 4 de gestión — Formalización: contratos por adjudicado y ciclos de
-- decaimiento de la adjudicación (Art. 110 y 113.4 LCP).
-- Idempotente: se puede volver a correr sin romper nada.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "EstadoContratoFase4" AS ENUM ('BORRADOR', 'GENERADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoDecaimiento" AS ENUM ('EN_CURSO', 'CERRADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DecisionDecaimiento" AS ENUM ('SUBSIGUIENTE', 'DESIERTO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Nuevos valores de TipoDocumento ────────────────────────────────────────
ALTER TYPE "TipoDocumento" ADD VALUE IF NOT EXISTS 'CERTIFICADO_INCUMPLIMIENTO';
ALTER TYPE "TipoDocumento" ADD VALUE IF NOT EXISTS 'RESOLUCION_DECAIMIENTO';
ALTER TYPE "TipoDocumento" ADD VALUE IF NOT EXISTS 'NOTIFICACION_DECAIMIENTO';
ALTER TYPE "TipoDocumento" ADD VALUE IF NOT EXISTS 'NOTIFICACION_ADJUDICACION_SUBSIGUIENTE';
ALTER TYPE "TipoDocumento" ADD VALUE IF NOT EXISTS 'NOTIFICACION_FIN_PROCEDIMIENTO';

-- ── Sellado de Fase 4 en el expediente ─────────────────────────────────────
ALTER TABLE "tb_expediente_contratacion"
  ADD COLUMN IF NOT EXISTS "sellado_fase4_at_au_au" TIMESTAMP(3);

-- ── Ciclos de decaimiento ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tb_decaimiento_adjudicacion_fase4_au_au" (
  "id" TEXT NOT NULL,
  "id_expediente" TEXT NOT NULL,
  "numero_ciclo_au_au" INTEGER NOT NULL,
  "estado_decaimiento_au_au" "EstadoDecaimiento" NOT NULL DEFAULT 'EN_CURSO',
  "id_proveedor_incumplidor_au_au" TEXT NOT NULL,
  "caracter_adjudicacion_au_au" VARCHAR(20) NOT NULL,
  "decision_decaimiento_au_au" "DecisionDecaimiento",
  "id_evaluacion_subsiguiente_au_au" TEXT,
  "causal_decaimiento_au_au" VARCHAR(255),
  "fecha_notificacion_adjudicacion_incumplidor_au_au" TIMESTAMP(3),
  "fecha_certificacion_incumplimiento_au_au" TIMESTAMP(3),
  "fecha_vencimiento_garantias_au_au" TIMESTAMP(3),
  "fecha_vencimiento_firma_contrato_au_au" TIMESTAMP(3),
  "alcance_readjudicacion_parcial_au_au" TEXT,
  "monto_readjudicado_parcial_bs_au_au" DECIMAL(15,2),
  "monto_readjudicado_bs_au_au" DECIMAL(15,2),
  "plazo_ejecucion_subsiguiente_au_au" INTEGER,
  "modalidad_degradada_sugerida_au_au" VARCHAR(100),
  "renglones_afectados_decaimiento_au_au" TEXT,
  "num_resolucion_decaimiento_au_au" VARCHAR(100),
  "fecha_resolucion_decaimiento_au_au" TIMESTAMP(3),
  "fec_notificacion_decaimiento_au_au" TIMESTAMP(3),
  "fec_notificacion_readjudicacion_au_au" TIMESTAMP(3),
  "fec_notificacion_desierto_au_au" TIMESTAMP(3),
  "fec_certificado_generado_au_au" TIMESTAMP(3),
  "fec_resolucion_generada_au_au" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "tb_decaimiento_adjudicacion_fase4_au_au_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tb_decaimiento_fase4_expediente_ciclo_key"
  ON "tb_decaimiento_adjudicacion_fase4_au_au" ("id_expediente", "numero_ciclo_au_au");

CREATE INDEX IF NOT EXISTS "tb_decaimiento_fase4_expediente_estado_idx"
  ON "tb_decaimiento_adjudicacion_fase4_au_au" ("id_expediente", "estado_decaimiento_au_au");

-- Solo un ciclo EN_CURSO por expediente (regla §5.5 del brief, en la base).
CREATE UNIQUE INDEX IF NOT EXISTS "tb_decaimiento_fase4_un_ciclo_activo"
  ON "tb_decaimiento_adjudicacion_fase4_au_au" ("id_expediente")
  WHERE "estado_decaimiento_au_au" = 'EN_CURSO' AND "deletedAt" IS NULL;

-- ── Contratos por adjudicado ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "tb_contrato_definitivo_fase4_au_au" (
  "id" TEXT NOT NULL,
  "id_expediente" TEXT NOT NULL,
  "id_evaluacion" TEXT NOT NULL,
  "clausulas_contrato_au_au" JSONB NOT NULL DEFAULT '[]',
  "estado_contrato_au_au" "EstadoContratoFase4" NOT NULL DEFAULT 'BORRADOR',
  "monto_contrato_bs_au_au" DECIMAL(15,2),
  "fec_generado_au_au" TIMESTAMP(3),
  "id_documento_generado" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,
  CONSTRAINT "tb_contrato_definitivo_fase4_au_au_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tb_contrato_fase4_evaluacion_key"
  ON "tb_contrato_definitivo_fase4_au_au" ("id_evaluacion");

CREATE INDEX IF NOT EXISTS "tb_contrato_fase4_expediente_idx"
  ON "tb_contrato_definitivo_fase4_au_au" ("id_expediente");

-- ── Documentos por ciclo de decaimiento ────────────────────────────────────
ALTER TABLE "DocumentoGenerado"
  ADD COLUMN IF NOT EXISTS "id_decaimiento" TEXT;

CREATE INDEX IF NOT EXISTS "DocumentoGenerado_id_decaimiento_idx"
  ON "DocumentoGenerado" ("id_decaimiento");

-- ── Llaves foráneas ────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "tb_decaimiento_adjudicacion_fase4_au_au"
    ADD CONSTRAINT "tb_decaimiento_fase4_expediente_fkey"
    FOREIGN KEY ("id_expediente") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tb_decaimiento_adjudicacion_fase4_au_au"
    ADD CONSTRAINT "tb_decaimiento_fase4_infractor_fkey"
    FOREIGN KEY ("id_proveedor_incumplidor_au_au") REFERENCES "tb_evaluacion_resultados"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tb_decaimiento_adjudicacion_fase4_au_au"
    ADD CONSTRAINT "tb_decaimiento_fase4_subsiguiente_fkey"
    FOREIGN KEY ("id_evaluacion_subsiguiente_au_au") REFERENCES "tb_evaluacion_resultados"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tb_contrato_definitivo_fase4_au_au"
    ADD CONSTRAINT "tb_contrato_fase4_expediente_fkey"
    FOREIGN KEY ("id_expediente") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tb_contrato_definitivo_fase4_au_au"
    ADD CONSTRAINT "tb_contrato_fase4_evaluacion_fkey"
    FOREIGN KEY ("id_evaluacion") REFERENCES "tb_evaluacion_resultados"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "tb_contrato_definitivo_fase4_au_au"
    ADD CONSTRAINT "tb_contrato_fase4_documento_fkey"
    FOREIGN KEY ("id_documento_generado") REFERENCES "DocumentoGenerado"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DocumentoGenerado"
    ADD CONSTRAINT "DocumentoGenerado_id_decaimiento_fkey"
    FOREIGN KEY ("id_decaimiento") REFERENCES "tb_decaimiento_adjudicacion_fase4_au_au"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
