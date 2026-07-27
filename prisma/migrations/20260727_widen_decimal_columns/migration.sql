-- Ampliar campos monetarios de modalidad_contratacion para soportar montos altos en Bs
ALTER TABLE "tb_modalidad_contratacion"
  ALTER COLUMN "monto_estimado_bs" TYPE DECIMAL(18, 4),
  ALTER COLUMN "monto_estimado_dolar" TYPE DECIMAL(18, 4),
  ALTER COLUMN "valor_ucau_base" TYPE DECIMAL(18, 4);
