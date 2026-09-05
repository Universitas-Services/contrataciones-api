-- ============================================================================
-- Bibliotecas de normativa y cláusulas (4 tablas)
--
-- Dos niveles, cada uno con su tabla propia:
--   Nivel UNIVERSITAS  -> tb_normativa_global, tb_clausulas_genericas_ente
--   Nivel Ente         -> tb_normativa_ente,   tb_biblioteca_clausulas_ente
--
-- Nota sobre los identificadores: la especificación los describe como Integer,
-- pero las claves foráneas apuntan a "Universitas"."id" y "EntePublico"."id",
-- que en este esquema son UUID en formato TEXT. Se usa TEXT para mantener la
-- integridad referencial con el resto del modelo.
-- ============================================================================

-- 1. tb_normativa_global — la administra UNIVERSITAS, la ven todos los entes
CREATE TABLE IF NOT EXISTS "tb_normativa_global" (
  "id_normativa_global"      TEXT NOT NULL,
  "id_admin_universitas"     TEXT NOT NULL,
  "texto_normativa_completo" TEXT NOT NULL,
  "ind_activo"               BOOLEAN NOT NULL DEFAULT true,
  "fec_creacion"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL,
  "deleted_at"               TIMESTAMP(3),
  "updated_by"               TEXT,
  CONSTRAINT "tb_normativa_global_pkey" PRIMARY KEY ("id_normativa_global")
);

CREATE INDEX IF NOT EXISTS "tb_normativa_global_id_admin_universitas_idx"
  ON "tb_normativa_global"("id_admin_universitas");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tb_normativa_global_id_admin_universitas_fkey'
  ) THEN
    ALTER TABLE "tb_normativa_global"
      ADD CONSTRAINT "tb_normativa_global_id_admin_universitas_fkey"
      FOREIGN KEY ("id_admin_universitas") REFERENCES "Universitas"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- 2. tb_normativa_ente — normativa propia de cada ente
CREATE TABLE IF NOT EXISTS "tb_normativa_ente" (
  "id_normativa_ente"        TEXT NOT NULL,
  "id_ente"                  TEXT NOT NULL,
  "texto_normativa_completo" TEXT NOT NULL,
  "fec_creacion"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL,
  "deleted_at"               TIMESTAMP(3),
  "created_by"               TEXT,
  "updated_by"               TEXT,
  CONSTRAINT "tb_normativa_ente_pkey" PRIMARY KEY ("id_normativa_ente")
);

CREATE INDEX IF NOT EXISTS "tb_normativa_ente_id_ente_idx"
  ON "tb_normativa_ente"("id_ente");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tb_normativa_ente_id_ente_fkey'
  ) THEN
    ALTER TABLE "tb_normativa_ente"
      ADD CONSTRAINT "tb_normativa_ente_id_ente_fkey"
      FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- 3. tb_clausulas_genericas_ente — cláusulas modelo que administra UNIVERSITAS
CREATE TABLE IF NOT EXISTS "tb_clausulas_genericas_ente" (
  "id_clausulas_genericas_ente" TEXT NOT NULL,
  "id_admin_universitas"        TEXT NOT NULL,
  "titulo_clausula_generica"    VARCHAR(255) NOT NULL,
  "cuerpo_clausula_generica"    TEXT NOT NULL,
  "created_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                  TIMESTAMP(3) NOT NULL,
  "deleted_at"                  TIMESTAMP(3),
  "updated_by"                  TEXT,
  CONSTRAINT "tb_clausulas_genericas_ente_pkey" PRIMARY KEY ("id_clausulas_genericas_ente")
);

CREATE INDEX IF NOT EXISTS "tb_clausulas_genericas_ente_id_admin_universitas_idx"
  ON "tb_clausulas_genericas_ente"("id_admin_universitas");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tb_clausulas_genericas_ente_id_admin_universitas_fkey'
  ) THEN
    ALTER TABLE "tb_clausulas_genericas_ente"
      ADD CONSTRAINT "tb_clausulas_genericas_ente_id_admin_universitas_fkey"
      FOREIGN KEY ("id_admin_universitas") REFERENCES "Universitas"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- 4. tb_biblioteca_clausulas_ente — cláusulas guardadas por cada ente
CREATE TABLE IF NOT EXISTS "tb_biblioteca_clausulas_ente" (
  "id_clausula_bib"              TEXT NOT NULL,
  "id_ente"                      TEXT NOT NULL,
  "titulo_clausula_bib"          VARCHAR(255) NOT NULL,
  "cuerpo_clausula_bib"          TEXT NOT NULL,
  "fecha_guardado_clausula_bib"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                   TIMESTAMP(3) NOT NULL,
  "deleted_at"                   TIMESTAMP(3),
  "created_by"                   TEXT,
  "updated_by"                   TEXT,
  CONSTRAINT "tb_biblioteca_clausulas_ente_pkey" PRIMARY KEY ("id_clausula_bib")
);

CREATE INDEX IF NOT EXISTS "tb_biblioteca_clausulas_ente_id_ente_idx"
  ON "tb_biblioteca_clausulas_ente"("id_ente");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tb_biblioteca_clausulas_ente_id_ente_fkey'
  ) THEN
    ALTER TABLE "tb_biblioteca_clausulas_ente"
      ADD CONSTRAINT "tb_biblioteca_clausulas_ente_id_ente_fkey"
      FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
