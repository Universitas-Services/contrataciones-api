-- Gestión Fase 3: carácter adjudicación, prelación adjudicación, ítems sin ofertas, dictámenes

ALTER TABLE "tb_expediente_contratacion"
  ADD COLUMN IF NOT EXISTS "caracter_adjudicacion_au_au" VARCHAR(20);

ALTER TABLE "tb_evaluacion_resultados"
  ADD COLUMN IF NOT EXISTS "posicion_prelacion_adjudicacion_au_au" VARCHAR(50);

ALTER TABLE "tb_informe_recomendacion"
  ADD COLUMN IF NOT EXISTS "existe_items_sin_ofertas_au_au" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "items_sin_ofertas_au_au" TEXT,
  ADD COLUMN IF NOT EXISTS "motivo_items_sin_ofertas_au_au" TEXT;

CREATE TABLE IF NOT EXISTS "tb_dictamen_adjudicacion" (
  "id" TEXT NOT NULL,
  "id_expediente" TEXT NOT NULL,
  "id_evaluacion" TEXT NOT NULL,
  "tipo_dictamen_au_au" VARCHAR(20) NOT NULL,
  "partidas_adjudicadas_total_au_au" TEXT,
  "monto_adjudicado_total_au_au" DECIMAL(15,2),
  "plazo_ejecucion_oferta_ganadora_au_au" INTEGER,
  "oferente_adjudicado_procedimiento_au_au" BOOLEAN,
  "causa_no_adjudicado_au_au" TEXT,
  "cantidad_renglones_au_au" INTEGER,
  "alcance_adjudicacion_parcial_au_au" TEXT,
  "partidas_adjudicadas_parcial_au_au" TEXT,
  "monto_adjudicado_parcial_au_au" DECIMAL(15,2),
  "plazo_ejecucion_oferta_parcial_au_au" INTEGER,
  "ind_verificado_garantia_au_au" BOOLEAN,
  "ind_verificado_crs_au_au" BOOLEAN,
  "notificacion_generada_au_au" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "updatedBy" TEXT,

  CONSTRAINT "tb_dictamen_adjudicacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tb_dictamen_adjudicacion_id_evaluacion_key"
  ON "tb_dictamen_adjudicacion"("id_evaluacion");

CREATE INDEX IF NOT EXISTS "tb_dictamen_adjudicacion_id_expediente_idx"
  ON "tb_dictamen_adjudicacion"("id_expediente");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tb_dictamen_adjudicacion_id_expediente_fkey'
  ) THEN
    ALTER TABLE "tb_dictamen_adjudicacion"
      ADD CONSTRAINT "tb_dictamen_adjudicacion_id_expediente_fkey"
      FOREIGN KEY ("id_expediente") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tb_dictamen_adjudicacion_id_evaluacion_fkey'
  ) THEN
    ALTER TABLE "tb_dictamen_adjudicacion"
      ADD CONSTRAINT "tb_dictamen_adjudicacion_id_evaluacion_fkey"
      FOREIGN KEY ("id_evaluacion") REFERENCES "tb_evaluacion_resultados"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
