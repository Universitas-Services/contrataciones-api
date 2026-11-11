-- CreateEnum
CREATE TYPE "EstadoExpedienteCompliance" AS ENUM ('CONFIGURANDO', 'ACTIVA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoDocumentoCompliance" AS ENUM ('PENDIENTE', 'PROCESANDO', 'ANALIZADO', 'RECHAZADO', 'ERROR');

-- CreateEnum
CREATE TYPE "EstadoDictamenCompliance" AS ENUM ('PENDIENTE', 'PROCESANDO', 'LISTO', 'ERROR');

-- CreateEnum
CREATE TYPE "RolMensajeCompliance" AS ENUM ('USUARIO', 'AGENTE');

-- CreateTable
CREATE TABLE "tb_expediente_compliance" (
    "id" TEXT NOT NULL,
    "id_ente" TEXT NOT NULL,
    "nomenclatura" VARCHAR(100),
    "nombre" VARCHAR(255),
    "modalidad" VARCHAR(60),
    "tipo_contratacion" VARCHAR(20),
    "estado" "EstadoExpedienteCompliance" NOT NULL DEFAULT 'CONFIGURANDO',
    "tipo_documento_solicitado" VARCHAR(60),
    "cerrado_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_expediente_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_documento_compliance" (
    "id" TEXT NOT NULL,
    "id_expediente_compliance" TEXT NOT NULL,
    "tipo_documento" VARCHAR(60) NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "url_archivo" TEXT NOT NULL,
    "mime_type" VARCHAR(120),
    "tamano_bytes" INTEGER NOT NULL,
    "estado" "EstadoDocumentoCompliance" NOT NULL DEFAULT 'PENDIENTE',
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "reemplazado_at" TIMESTAMP(3),
    "json_analista" JSONB,
    "informe_markdown" TEXT,
    "estatus_global" VARCHAR(20),
    "tipo_coincide" BOOLEAN,
    "tipo_detectado" VARCHAR(60),
    "metricas" JSONB,
    "error" TEXT,
    "analizado_at" TIMESTAMP(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "intentos_429" INTEGER NOT NULL DEFAULT 0,
    "fallos_temporales" INTEGER NOT NULL DEFAULT 0,
    "proximo_intento_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "primer_intento_at" TIMESTAMP(3),
    "tomado_hasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "tb_documento_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_dictamen_compliance" (
    "id" TEXT NOT NULL,
    "id_expediente_compliance" TEXT NOT NULL,
    "estado" "EstadoDictamenCompliance" NOT NULL DEFAULT 'PENDIENTE',
    "forzar_final" BOOLEAN NOT NULL DEFAULT false,
    "alcance" VARCHAR(20),
    "markdown" TEXT,
    "puntaje" JSONB,
    "pendientes" JSONB,
    "coherencia" JSONB,
    "error" TEXT,
    "listo_at" TIMESTAMP(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "intentos_429" INTEGER NOT NULL DEFAULT 0,
    "fallos_temporales" INTEGER NOT NULL DEFAULT 0,
    "proximo_intento_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "primer_intento_at" TIMESTAMP(3),
    "tomado_hasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "tb_dictamen_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_mensaje_compliance" (
    "id" TEXT NOT NULL,
    "id_expediente_compliance" TEXT NOT NULL,
    "rol" "RolMensajeCompliance" NOT NULL,
    "texto" TEXT NOT NULL,
    "id_usuario" TEXT,
    "id_documento_compliance" TEXT,
    "id_dictamen_compliance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_mensaje_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tb_expediente_compliance_id_ente_deletedAt_idx" ON "tb_expediente_compliance"("id_ente", "deletedAt");

-- CreateIndex
CREATE INDEX "tb_documento_compliance_id_expediente_compliance_vigente_idx" ON "tb_documento_compliance"("id_expediente_compliance", "vigente");

-- CreateIndex
CREATE INDEX "tb_documento_compliance_estado_proximo_intento_at_idx" ON "tb_documento_compliance"("estado", "proximo_intento_at");

-- CreateIndex
CREATE INDEX "tb_dictamen_compliance_id_expediente_compliance_createdAt_idx" ON "tb_dictamen_compliance"("id_expediente_compliance", "createdAt");

-- CreateIndex
CREATE INDEX "tb_dictamen_compliance_estado_proximo_intento_at_idx" ON "tb_dictamen_compliance"("estado", "proximo_intento_at");

-- CreateIndex
CREATE INDEX "tb_mensaje_compliance_id_expediente_compliance_createdAt_idx" ON "tb_mensaje_compliance"("id_expediente_compliance", "createdAt");

-- RenameForeignKey
ALTER TABLE "tb_contrato_definitivo_fase4_au_au" RENAME CONSTRAINT "tb_contrato_fase4_documento_fkey" TO "tb_contrato_definitivo_fase4_au_au_id_documento_generado_fkey";

-- RenameForeignKey
ALTER TABLE "tb_contrato_definitivo_fase4_au_au" RENAME CONSTRAINT "tb_contrato_fase4_evaluacion_fkey" TO "tb_contrato_definitivo_fase4_au_au_id_evaluacion_fkey";

-- RenameForeignKey
ALTER TABLE "tb_contrato_definitivo_fase4_au_au" RENAME CONSTRAINT "tb_contrato_fase4_expediente_fkey" TO "tb_contrato_definitivo_fase4_au_au_id_expediente_fkey";

-- RenameForeignKey
ALTER TABLE "tb_decaimiento_adjudicacion_fase4_au_au" RENAME CONSTRAINT "tb_decaimiento_fase4_expediente_fkey" TO "tb_decaimiento_adjudicacion_fase4_au_au_id_expediente_fkey";

-- RenameForeignKey
ALTER TABLE "tb_decaimiento_adjudicacion_fase4_au_au" RENAME CONSTRAINT "tb_decaimiento_fase4_infractor_fkey" TO "tb_decaimiento_adjudicacion_fase4_au_au_id_proveedor_incum_fkey";

-- RenameForeignKey
ALTER TABLE "tb_decaimiento_adjudicacion_fase4_au_au" RENAME CONSTRAINT "tb_decaimiento_fase4_subsiguiente_fkey" TO "tb_decaimiento_adjudicacion_fase4_au_au_id_evaluacion_subs_fkey";

-- AddForeignKey
ALTER TABLE "tb_expediente_compliance" ADD CONSTRAINT "tb_expediente_compliance_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_documento_compliance" ADD CONSTRAINT "tb_documento_compliance_id_expediente_compliance_fkey" FOREIGN KEY ("id_expediente_compliance") REFERENCES "tb_expediente_compliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_dictamen_compliance" ADD CONSTRAINT "tb_dictamen_compliance_id_expediente_compliance_fkey" FOREIGN KEY ("id_expediente_compliance") REFERENCES "tb_expediente_compliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_mensaje_compliance" ADD CONSTRAINT "tb_mensaje_compliance_id_expediente_compliance_fkey" FOREIGN KEY ("id_expediente_compliance") REFERENCES "tb_expediente_compliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_mensaje_compliance" ADD CONSTRAINT "tb_mensaje_compliance_id_documento_compliance_fkey" FOREIGN KEY ("id_documento_compliance") REFERENCES "tb_documento_compliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_mensaje_compliance" ADD CONSTRAINT "tb_mensaje_compliance_id_dictamen_compliance_fkey" FOREIGN KEY ("id_dictamen_compliance") REFERENCES "tb_dictamen_compliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "tb_contrato_fase4_evaluacion_key" RENAME TO "tb_contrato_definitivo_fase4_au_au_id_evaluacion_key";

-- RenameIndex
ALTER INDEX "tb_contrato_fase4_expediente_idx" RENAME TO "tb_contrato_definitivo_fase4_au_au_id_expediente_idx";

-- RenameIndex
ALTER INDEX "tb_decaimiento_fase4_expediente_ciclo_key" RENAME TO "tb_decaimiento_adjudicacion_fase4_au_au_id_expediente_numer_key";

-- RenameIndex
ALTER INDEX "tb_decaimiento_fase4_expediente_estado_idx" RENAME TO "tb_decaimiento_adjudicacion_fase4_au_au_id_expediente_estad_idx";
