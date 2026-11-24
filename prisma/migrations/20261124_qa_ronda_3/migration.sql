-- Ajustes de QA, ronda 3 (24 de noviembre de 2026)

-- Cajas de texto: hasta 4000 caracteres (el límite lo valida la API).
ALTER TABLE "tb_fase_preparatoria"
  ALTER COLUMN "objetivos_especificos_1" TYPE TEXT,
  ALTER COLUMN "objetivos_especificos_2" TYPE TEXT,
  ALTER COLUMN "objetivos_especificos_3" TYPE TEXT,
  ALTER COLUMN "justificacion_contrato_marco_au_au" TYPE TEXT,
  ALTER COLUMN "justificacion_permite_pymes_cooperativas_au_au" TYPE TEXT,
  ALTER COLUMN "lugar_logistica_ejecucion_au_au" TYPE TEXT,
  ALTER COLUMN "detalle_especializado_au_au" TYPE TEXT,
  ALTER COLUMN "detalle_procedimiento_muestras_au_au" TYPE TEXT,
  ALTER COLUMN "forma_cumplimiento_crs_au_au" TYPE TEXT;

-- Estatus anterior a la declaratoria de desierto, para poder revertirla.
ALTER TABLE "tb_expediente_contratacion"
  ADD COLUMN "estatus_previo_desierto" VARCHAR(40);

-- Orden de las cláusulas genéricas, el de la documentación.
ALTER TABLE "tb_clausulas_genericas_ente" ADD COLUMN "num_orden" INTEGER;

UPDATE "tb_clausulas_genericas_ente" AS c
SET "num_orden" = v.orden
FROM (VALUES
  ('OBJETO DEL CONTRATO', 1),
  ('DOCUMENTOS CONTRACTUALES', 2),
  ('MONTO DEL CONTRATO Y CRÉDITO PRESUPUESTARIO', 3),
  ('PLAZO DE EJECUCIÓN', 4),
  ('CONDICIONES DE LA EJECUCIÓN PRESUPUESTARIA', 5),
  ('CONDICIONES Y MODO DE PAGO', 6),
  ('SUPERVISIÓN DEL CONTRATO', 7),
  ('GARANTÍAS CONTRACTUALES', 8),
  ('COMPROMISO DE RESPONSABILIDAD SOCIAL', 9),
  ('PENALIZACIÓN POR RETRASO E INCUMPLIMIENTO', 10),
  ('MECANISMO DE AJUSTE DE PRECIOS', 11),
  ('PROHIBICIÓN DE CESIÓN DEL CONTRATO', 12),
  ('EVALUACIÓN DE DESEMPEÑO', 13),
  ('GARANTÍA POST-EJECUCIÓN', 14),
  ('EJECUCIÓN DEL CONTRATO', 15),
  ('RESCISIÓN DEL CONTRATO', 16),
  ('MODIFICACIONES CONTRACTUALES', 17),
  ('INALTERABILIDAD DE LAS CONDICIONES', 18),
  ('FINIQUITO DEL CONTRATO', 19),
  ('CIERRE ADMINISTRATIVO DEL CONTRATO', 20),
  ('DURACIÓN Y VIGENCIA DEL CONTRATO', 21),
  ('DOMICILIO ESPECIAL Y RESOLUCIÓN DE CONTROVERSIAS', 22)
) AS v(titulo, orden)
WHERE UPPER(TRIM(c."titulo_clausula_generica")) = v.titulo;
