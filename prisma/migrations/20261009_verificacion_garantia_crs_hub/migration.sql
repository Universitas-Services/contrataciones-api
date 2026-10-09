-- Garantía de mantenimiento y CRS: pasan del dictamen/informe (Fase 3)
-- al hub de Calificación Legal (Sobre 2), por oferente.

ALTER TABLE "tb_evaluacion_resultados"
  ADD COLUMN IF NOT EXISTS "ind_verificado_garantia_au_au" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "ind_verificado_crs_au_au" BOOLEAN;

ALTER TABLE "tb_dictamen_adjudicacion"
  DROP COLUMN IF EXISTS "ind_verificado_garantia_au_au",
  DROP COLUMN IF EXISTS "ind_verificado_crs_au_au";

ALTER TABLE "tb_informe_recomendacion"
  DROP COLUMN IF EXISTS "ind_verificado_garantia_au_au",
  DROP COLUMN IF EXISTS "ind_verificado_crs_au_au";
