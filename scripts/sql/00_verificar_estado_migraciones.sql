-- ============================================================================
-- QUÉ HACE:  Muestra el estado del registro de migraciones de Prisma y verifica
--            si los objetos de la Fase 1 ya existen en la base.
-- POR QUÉ:   Antes de desplegar hay que saber si Prisma tiene registradas las
--            migraciones ya aplicadas. Si alguien corrió el SQL a mano sin
--            registrarlo, `prisma migrate deploy` intentará repetirlo, fallará
--            ("column already exists") y el contenedor no arrancará.
-- CUÁNDO:    Antes de cada despliegue que traiga migraciones nuevas.
-- ESCRIBE:   No. Este script es de solo lectura.
-- ============================================================================

-- 1. Migraciones que Prisma tiene registradas.
--    `finished_at` con valor  = aplicada correctamente.
--    `finished_at` en NULL    = quedó a medias (hay que resolverla).
--    `rolled_back_at` con valor = marcada como revertida.
SELECT
  migration_name,
  finished_at,
  rolled_back_at,
  applied_steps_count
FROM _prisma_migrations
ORDER BY started_at;

-- 2. ¿Existen ya en la base los objetos que crean las migraciones nuevas?
--    Si una migración NO aparece arriba pero sus objetos SÍ existen aquí,
--    significa que se aplicó a mano y hay que registrarla con:
--      npx prisma migrate resolve --applied <nombre_migracion>
SELECT
  'tabla: tb_fase1_especificaciones' AS objeto,
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tb_fase1_especificaciones'
  ) AS existe
UNION ALL
SELECT
  'tabla: tb_cuentas_bancarias_ente',
  EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tb_cuentas_bancarias_ente'
  )
UNION ALL
SELECT
  'enum: EstadoMicromodulo',
  EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstadoMicromodulo')
UNION ALL
SELECT
  'columna: estado_actividades_previas_au_au',
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tb_fase_preparatoria'
      AND column_name = 'estado_actividades_previas_au_au'
  )
UNION ALL
SELECT
  'columna: declaratoria_desierto_au_au es NOT NULL',
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tb_expediente_contratacion'
      AND column_name = 'declaratoria_desierto_au_au'
      AND is_nullable = 'NO'
  );

-- 3. Filas con declaratoria_desierto en NULL.
--    La migración 20260829_fix_declaratoria_desierto_not_null las rellena con
--    false antes de imponer NOT NULL. Debe dar 0 después de aplicarla.
SELECT COUNT(*) AS filas_con_declaratoria_null
FROM tb_expediente_contratacion
WHERE declaratoria_desierto_au_au IS NULL;
