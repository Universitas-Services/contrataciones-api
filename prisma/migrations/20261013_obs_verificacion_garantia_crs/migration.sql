-- Observaciones opcionales de la verificación de garantía de mantenimiento y CRS (hub legal, Sobre 2)

ALTER TABLE "tb_evaluacion_resultados"
  ADD COLUMN IF NOT EXISTS "obs_verificado_garantia_au_au" TEXT,
  ADD COLUMN IF NOT EXISTS "obs_verificado_crs_au_au" TEXT;
