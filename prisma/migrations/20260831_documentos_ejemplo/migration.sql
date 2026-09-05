-- ============================================================================
-- Catálogo de documentos de ejemplo (imágenes de referencia)
--
-- Los administra UNIVERSITAS y los entes los consultan como guía visual.
-- `cod_documento_ejemplo_au_au` es un identificador legible (documento-01,
-- documento-02) para que el frontend pida cada imagen sin conocer el UUID.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "tb_documentos_ejemplo" (
  "id_documento_ejemplo_au_au"     TEXT NOT NULL,
  "cod_documento_ejemplo_au_au"    VARCHAR(50) NOT NULL,
  "nombre_documento_ejemplo_au_au" VARCHAR(255) NOT NULL,
  "desc_documento_ejemplo_au_au"   TEXT,
  "file_name_au_au"                VARCHAR(255) NOT NULL,
  "mime_type_au_au"                VARCHAR(100) NOT NULL,
  "size_bytes_au_au"               INTEGER NOT NULL,
  "storage_key_au_au"              VARCHAR(500),
  "url_au_au"                      TEXT NOT NULL,
  "orden_au_au"                    INTEGER,
  "activo_au_au"                   BOOLEAN NOT NULL DEFAULT true,
  "created_at"                     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                     TIMESTAMP(3) NOT NULL,
  "deleted_at"                     TIMESTAMP(3),
  "created_by"                     TEXT,
  "updated_by"                     TEXT,
  CONSTRAINT "tb_documentos_ejemplo_pkey" PRIMARY KEY ("id_documento_ejemplo_au_au")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tb_documentos_ejemplo_cod_documento_ejemplo_au_au_key"
  ON "tb_documentos_ejemplo"("cod_documento_ejemplo_au_au");
CREATE INDEX IF NOT EXISTS "tb_documentos_ejemplo_cod_documento_ejemplo_au_au_idx"
  ON "tb_documentos_ejemplo"("cod_documento_ejemplo_au_au");
