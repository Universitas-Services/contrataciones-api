-- ============================================================================
-- Fase 1 (Preparatoria) — Micromódulos: estados, campos nuevos y tablas de apoyo
-- ============================================================================

-- 1. Enum de estado por micromódulo
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoMicromodulo') THEN
    CREATE TYPE "EstadoMicromodulo" AS ENUM ('PENDIENTE', 'BORRADOR', 'COMPLETADO');
  END IF;
END$$;

-- 1b. Nuevo tipo de documento maestro de la Fase 1
ALTER TYPE "TipoDocumento" ADD VALUE IF NOT EXISTS 'ACTIVIDADES_PREVIAS';

-- 2. Estados por micromódulo + cierre de fase
ALTER TABLE "tb_fase_preparatoria"
  ADD COLUMN IF NOT EXISTS "estado_actividades_previas_au_au"          "EstadoMicromodulo" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "estado_llamado_au_au"                      "EstadoMicromodulo" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "estado_aspectos_generales_au_au"           "EstadoMicromodulo" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "estado_modelo_contrato_au_au"              "EstadoMicromodulo" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "estado_calificacion_legal_au_au"           "EstadoMicromodulo" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "estado_calificacion_financiera_au_au"      "EstadoMicromodulo" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "estado_calificacion_tecnica_au_au"         "EstadoMicromodulo" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "estado_evaluacion_tecnica_economica_au_au" "EstadoMicromodulo" NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "phase_complete_au_au"                      BOOLEAN NOT NULL DEFAULT false;

-- 3. Actividades Previas
ALTER TABLE "tb_fase_preparatoria"
  ADD COLUMN IF NOT EXISTS "num_referencia_snc_au_au"                       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "modif_requerimiento_snc_au_au"                  BOOLEAN,
  ADD COLUMN IF NOT EXISTS "numero_modif_requerimiento_snc_au_au"           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "justificacion_necesidad_contratacion_au_au"     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "proyecto_aprobado_au_au"                        BOOLEAN,
  ADD COLUMN IF NOT EXISTS "permite_pymes_cooperativas_au_au"               BOOLEAN,
  ADD COLUMN IF NOT EXISTS "justificacion_permite_pymes_cooperativas_au_au" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "fec_estudio_mercado_au_au"                      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "num_certificacion_presupuestaria_au_au"         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "plazo_ejecucion_procedimiento_au_au"            INTEGER,
  ADD COLUMN IF NOT EXISTS "lugar_logistica_ejecucion_au_au"                VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "requiere_especializado_au_au"                   BOOLEAN,
  ADD COLUMN IF NOT EXISTS "detalle_especializado_au_au"                    VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "requiere_muestras_au_au"                        BOOLEAN,
  ADD COLUMN IF NOT EXISTS "detalle_procedimiento_muestras_au_au"           VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "activa_promocion_economica_au_au"               BOOLEAN,
  ADD COLUMN IF NOT EXISTS "requiere_van_au_au"                             BOOLEAN,
  ADD COLUMN IF NOT EXISTS "puntaje_van_au_au"                              INTEGER,
  ADD COLUMN IF NOT EXISTS "ind_pref_local_au_au"                           BOOLEAN,
  ADD COLUMN IF NOT EXISTS "puntuacion_bono_local_au_au"                    DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "ind_bono_sujeto_au_au"                          BOOLEAN,
  ADD COLUMN IF NOT EXISTS "puntuacion_bono_sujeto_au_au"                   DECIMAL(5, 2);

-- 4. Llamado (complemento)
ALTER TABLE "tb_fase_preparatoria"
  ADD COLUMN IF NOT EXISTS "rif_pago_pliego_au_au" VARCHAR(100);

-- 5. Aspectos Generales del Pliego
ALTER TABLE "tb_fase_preparatoria"
  ADD COLUMN IF NOT EXISTS "moneda_diferente_au_au"                  BOOLEAN,
  ADD COLUMN IF NOT EXISTS "nom_moneda_extranjera_au_au"             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "idioma_diferente_au_au"                  BOOLEAN,
  ADD COLUMN IF NOT EXISTS "nom_idioma_diferente_au_au"              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "porcentaje_responsabilidad_social_au_au"  DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "unidad_resp_cumplimiento_crs_au_au"       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "modalidad_crs_au_au"                      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "forma_cumplimiento_crs_au_au"             VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "porcentaje_mantenimiento_oferta_au_au"    DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "porcentaje_fiel_cumplimiento_au_au"       DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "retencion_fiel_cumplimiento_au_au"        BOOLEAN,
  ADD COLUMN IF NOT EXISTS "requiere_garantia_laboral_au_au"          BOOLEAN,
  ADD COLUMN IF NOT EXISTS "porcentaje_garantia_laboral_au_au"        DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "retencion_fianza_laboral_au_au"           BOOLEAN,
  ADD COLUMN IF NOT EXISTS "poliza_responsabilidad_civil_au_au"       BOOLEAN,
  ADD COLUMN IF NOT EXISTS "porcentaje_responsabilidad_civil_au_au"   DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "monto_responsabilidad_civil_bs_au_au"     DECIMAL(18, 4),
  ADD COLUMN IF NOT EXISTS "anticipo_contrato_au_au"                  BOOLEAN,
  ADD COLUMN IF NOT EXISTS "porcentaje_anticipo_au_au"                DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "anticipo_especial_au_au"                  BOOLEAN,
  ADD COLUMN IF NOT EXISTS "porcentaje_anticipo_especial_au_au"       DECIMAL(5, 2);

-- 6. Micromódulos complejos (JSONB)
ALTER TABLE "tb_fase_preparatoria"
  ADD COLUMN IF NOT EXISTS "modelo_contrato_data_au_au"             JSONB,
  ADD COLUMN IF NOT EXISTS "calificacion_legal_data_au_au"          JSONB,
  ADD COLUMN IF NOT EXISTS "calificacion_financiera_data_au_au"     JSONB,
  ADD COLUMN IF NOT EXISTS "calificacion_tecnica_data_au_au"        JSONB,
  ADD COLUMN IF NOT EXISTS "evaluacion_tecnica_economica_data_au_au" JSONB;

-- 7. Especificaciones técnicas (archivo adjunto de la fase)
CREATE TABLE IF NOT EXISTS "tb_fase1_especificaciones" (
  "id_fase1_especificacion_au_au" TEXT NOT NULL,
  "id_fase_preparatoria"          TEXT NOT NULL,
  "file_name_au_au"               VARCHAR(255) NOT NULL,
  "mime_type_au_au"               VARCHAR(100) NOT NULL,
  "size_bytes_au_au"              INTEGER NOT NULL,
  "storage_key_au_au"             VARCHAR(500),
  "url_au_au"                     TEXT NOT NULL,
  "uploaded_at_au_au"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploaded_by_au_au"             TEXT,
  "created_at"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                    TIMESTAMP(3) NOT NULL,
  "deleted_at"                    TIMESTAMP(3),
  CONSTRAINT "tb_fase1_especificaciones_pkey" PRIMARY KEY ("id_fase1_especificacion_au_au")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tb_fase1_especificaciones_id_fase_preparatoria_key"
  ON "tb_fase1_especificaciones"("id_fase_preparatoria");
CREATE INDEX IF NOT EXISTS "tb_fase1_especificaciones_id_fase_preparatoria_idx"
  ON "tb_fase1_especificaciones"("id_fase_preparatoria");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tb_fase1_especificaciones_id_fase_preparatoria_fkey'
  ) THEN
    ALTER TABLE "tb_fase1_especificaciones"
      ADD CONSTRAINT "tb_fase1_especificaciones_id_fase_preparatoria_fkey"
      FOREIGN KEY ("id_fase_preparatoria") REFERENCES "tb_fase_preparatoria"("id_fase_preparatoria")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- 8. Cuentas bancarias del ente (alimentan el pago de pliego en el Llamado)
CREATE TABLE IF NOT EXISTS "tb_cuentas_bancarias_ente" (
  "id_cuenta_bancaria_au_au"  TEXT NOT NULL,
  "id_ente"                   TEXT NOT NULL,
  "banco_pago_pliego_au_au"   VARCHAR(100) NOT NULL,
  "cuenta_pago_pliego_au_au"  VARCHAR(20) NOT NULL,
  "tipo_cuenta_au_au"         VARCHAR(50),
  "titular_pago_pliego_au_au" VARCHAR(100) NOT NULL,
  "rif_pago_pliego_au_au"     VARCHAR(100) NOT NULL,
  "created_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                TIMESTAMP(3) NOT NULL,
  "deleted_at"                TIMESTAMP(3),
  "created_by"                TEXT,
  "updated_by"                TEXT,
  CONSTRAINT "tb_cuentas_bancarias_ente_pkey" PRIMARY KEY ("id_cuenta_bancaria_au_au")
);

CREATE INDEX IF NOT EXISTS "tb_cuentas_bancarias_ente_id_ente_idx"
  ON "tb_cuentas_bancarias_ente"("id_ente");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tb_cuentas_bancarias_ente_id_ente_fkey'
  ) THEN
    ALTER TABLE "tb_cuentas_bancarias_ente"
      ADD CONSTRAINT "tb_cuentas_bancarias_ente_id_ente_fkey"
      FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
