ALTER TABLE "tb_comision_contrataciones" ADD COLUMN IF NOT EXISTS "ind_activa" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "tb_unidad_usuaria" ADD COLUMN IF NOT EXISTS "ind_activa" BOOLEAN NOT NULL DEFAULT true;
