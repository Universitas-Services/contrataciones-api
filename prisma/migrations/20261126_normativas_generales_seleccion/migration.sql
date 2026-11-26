-- Normativas generales que el usuario elige para el pliego. Vacío en los expedientes
-- anteriores, que siguen llevando todas.
ALTER TABLE "tb_fase_preparatoria" ADD COLUMN "normativas_generales_ids" JSONB;
