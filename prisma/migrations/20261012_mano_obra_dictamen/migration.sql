-- Monto de mano de obra ofertado por el adjudicado (base de la Fianza Laboral)

ALTER TABLE "tb_dictamen_adjudicacion"
  ADD COLUMN IF NOT EXISTS "monto_mano_obra_ofertado_au_au" DECIMAL(15,2);
