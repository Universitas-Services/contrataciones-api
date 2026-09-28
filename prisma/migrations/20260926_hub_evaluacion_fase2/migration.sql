-- ============================================================================
-- Hub de evaluación del oferente (Fase 2 — Concurso Abierto / Acto Único)
--
-- Se agregan columnas JSON sobre la fila existente de tb_evaluacion_resultados,
-- que sigue siendo el ancla de la evaluación (una por oferta). Las columnas
-- booleanas antiguas de sobre 1 y 2 quedan intactas para el flujo legacy.
--
-- plantillas_snapshot_au_au guarda una copia inmutable de lo exigido en Fase 1
-- al abrir la evaluación: si el pliego se edita después, la evaluación en curso
-- conserva la plantilla con la que empezó.
-- ============================================================================

ALTER TABLE "tb_evaluacion_resultados"
  ADD COLUMN IF NOT EXISTS "plantillas_snapshot_au_au" JSONB,
  ADD COLUMN IF NOT EXISTS "hub_legal_au_au"           JSONB,
  ADD COLUMN IF NOT EXISTS "hub_financiera_au_au"      JSONB,
  ADD COLUMN IF NOT EXISTS "hub_tecnica_au_au"         JSONB,
  ADD COLUMN IF NOT EXISTS "hub_evaluacion_au_au"      JSONB,
  ADD COLUMN IF NOT EXISTS "hub_promocion_au_au"       JSONB,
  ADD COLUMN IF NOT EXISTS "hub_unlocked_au_au"        JSONB,
  ADD COLUMN IF NOT EXISTS "hub_active_modulo_au_au"   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "hub_resultado_final_au_au" VARCHAR(20);
