/*
  Warnings:

  - You are about to drop the `ComisionContrataciones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CronogramaExpediente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpedienteContratacion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MaximaAutoridad` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MiembroComision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UnidadContratante` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UnidadUsuaria` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Adjudicacion" DROP CONSTRAINT "Adjudicacion_expedienteId_fkey";

-- DropForeignKey
ALTER TABLE "AdquirentePliego" DROP CONSTRAINT "AdquirentePliego_expedienteId_fkey";

-- DropForeignKey
ALTER TABLE "ComisionContrataciones" DROP CONSTRAINT "ComisionContrataciones_enteId_fkey";

-- DropForeignKey
ALTER TABLE "CronogramaExpediente" DROP CONSTRAINT "CronogramaExpediente_expedienteId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentoGenerado" DROP CONSTRAINT "DocumentoGenerado_expedienteId_fkey";

-- DropForeignKey
ALTER TABLE "ExpedienteContratacion" DROP CONSTRAINT "ExpedienteContratacion_autoridadId_fkey";

-- DropForeignKey
ALTER TABLE "ExpedienteContratacion" DROP CONSTRAINT "ExpedienteContratacion_comisionId_fkey";

-- DropForeignKey
ALTER TABLE "ExpedienteContratacion" DROP CONSTRAINT "ExpedienteContratacion_enteId_fkey";

-- DropForeignKey
ALTER TABLE "ExpedienteContratacion" DROP CONSTRAINT "ExpedienteContratacion_unidadUsuariaId_fkey";

-- DropForeignKey
ALTER TABLE "FasePreparatoria" DROP CONSTRAINT "FasePreparatoria_expedienteId_fkey";

-- DropForeignKey
ALTER TABLE "MaximaAutoridad" DROP CONSTRAINT "MaximaAutoridad_enteId_fkey";

-- DropForeignKey
ALTER TABLE "MiembroComision" DROP CONSTRAINT "MiembroComision_comisionId_fkey";

-- DropForeignKey
ALTER TABLE "OfertaPresentada" DROP CONSTRAINT "OfertaPresentada_expedienteId_fkey";

-- DropForeignKey
ALTER TABLE "PartidaPresupuestaria" DROP CONSTRAINT "PartidaPresupuestaria_expedienteId_fkey";

-- DropForeignKey
ALTER TABLE "UnidadContratante" DROP CONSTRAINT "UnidadContratante_enteId_fkey";

-- DropForeignKey
ALTER TABLE "UnidadUsuaria" DROP CONSTRAINT "UnidadUsuaria_enteId_fkey";

-- DropTable
DROP TABLE "ComisionContrataciones";

-- DropTable
DROP TABLE "CronogramaExpediente";

-- DropTable
DROP TABLE "ExpedienteContratacion";

-- DropTable
DROP TABLE "MaximaAutoridad";

-- DropTable
DROP TABLE "MiembroComision";

-- DropTable
DROP TABLE "UnidadContratante";

-- DropTable
DROP TABLE "UnidadUsuaria";

-- CreateTable
CREATE TABLE "tb_maxima_autoridad" (
    "id_autoridad" TEXT NOT NULL,
    "id_ente" TEXT NOT NULL,
    "nom_completo_autorida" TEXT NOT NULL,
    "cedula_autoridad" TEXT NOT NULL,
    "cargo_oficial_autoridad" TEXT NOT NULL,
    "datos_designacion_autoridad" TEXT,
    "leyes_atribuciones_suscribir_autoridad" TEXT,
    "ind_es_delegado" BOOLEAN NOT NULL DEFAULT false,
    "ind_autoridad_vigente" BOOLEAN NOT NULL DEFAULT true,
    "nom_completo_delegado" TEXT,
    "cedula_delegado" TEXT,
    "cargo_oficial_delegado" TEXT,
    "datos_designacion_delegado" TEXT,
    "leyes_atribuciones_suscribir_delegado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tb_maxima_autoridad_pkey" PRIMARY KEY ("id_autoridad")
);

-- CreateTable
CREATE TABLE "tb_comision_contrataciones" (
    "id_comision" TEXT NOT NULL,
    "id_ente" TEXT NOT NULL,
    "denominacion_comision" TEXT NOT NULL,
    "datos_designacion_comision" TEXT,
    "ind_comision_certificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tb_comision_contrataciones_pkey" PRIMARY KEY ("id_comision")
);

-- CreateTable
CREATE TABLE "tb_miembro_comision" (
    "id_miembro" TEXT NOT NULL,
    "id_comision" TEXT NOT NULL,
    "nom_completo_miembro" TEXT NOT NULL,
    "cedula_miembro" TEXT NOT NULL,
    "tipo_miembro" "TipoMiembro" NOT NULL,
    "area_representacion" "AreaRepresentacion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tb_miembro_comision_pkey" PRIMARY KEY ("id_miembro")
);

-- CreateTable
CREATE TABLE "tb_unidad_usuaria" (
    "id_unidad_usuaria" TEXT NOT NULL,
    "id_ente" TEXT NOT NULL,
    "nom_unidad_usuaria" TEXT NOT NULL,
    "nom_responsable_unidad_usuaria" TEXT NOT NULL,
    "cargo_responsable_unidad_usuaria" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_unidad_usuaria_pkey" PRIMARY KEY ("id_unidad_usuaria")
);

-- CreateTable
CREATE TABLE "tb_unidad_contratante" (
    "id_unidad_contratante" TEXT NOT NULL,
    "id_ente" TEXT NOT NULL,
    "nom_unidad_contratante" TEXT NOT NULL,
    "nom_responsable_unidad" TEXT NOT NULL,
    "cargo_responsable" TEXT NOT NULL,
    "ind_activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_unidad_contratante_pkey" PRIMARY KEY ("id_unidad_contratante")
);

-- CreateTable
CREATE TABLE "tb_modalidad_contratacion" (
    "id_modalidad" TEXT NOT NULL,
    "id_ente" TEXT NOT NULL,
    "tipo_contratacion" "TipoContratacion" NOT NULL,
    "monto_estimado_bs" DECIMAL(15,2) NOT NULL,
    "monto_estimado_dolar" DECIMAL(15,2) NOT NULL,
    "valor_ucau_base" DECIMAL(10,4) NOT NULL,
    "modalidad_seleccion" "ModalidadSeleccion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tb_modalidad_contratacion_pkey" PRIMARY KEY ("id_modalidad")
);

-- CreateTable
CREATE TABLE "tb_expediente_contratacion" (
    "id_expediente_au_au" TEXT NOT NULL,
    "id_ente" TEXT NOT NULL,
    "id_modalidad" TEXT NOT NULL,
    "id_comision" TEXT NOT NULL,
    "id_unidad_usuaria" TEXT NOT NULL,
    "id_autoridad" TEXT NOT NULL,
    "desc_objeto_contratacion_au_au" TEXT NOT NULL,
    "cod_nomenclatura_proceso_au_au" TEXT NOT NULL,
    "estatus_proceso_au_au" "EstatusProceso" NOT NULL DEFAULT 'BORRADOR',
    "total_presupuesto_au_au" DECIMAL(15,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tb_expediente_contratacion_pkey" PRIMARY KEY ("id_expediente_au_au")
);

-- CreateTable
CREATE TABLE "tb_cronograma_expediente" (
    "id_cronograma_au_au" TEXT NOT NULL,
    "id_expediente_au_au" TEXT NOT NULL,
    "fec_llamado_participar_au_au" TIMESTAMP(3),
    "fec_inicio_disponibilidad_pliego_au_au" TIMESTAMP(3),
    "fec_fin_disponibilidad_pliego_au_au" TIMESTAMP(3),
    "fec_solicitud_aclaratorias_au_au" TIMESTAMP(3),
    "fec_respuesta_aclaratorias_au_au" TIMESTAMP(3),
    "fec_modific_pliego_au_au" TIMESTAMP(3),
    "fec_acto_recep_aper_sobres_au_au" TIMESTAMP(3),
    "fec_limite_evaluacion_au_au" TIMESTAMP(3),
    "fec_limite_adjudicacion_au_au" TIMESTAMP(3),
    "fec_limite_notificacion_au_au" TIMESTAMP(3),
    "fec_limite_garantias_au_au" TIMESTAMP(3),
    "fec_limite_firma_contrato_au_au" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tb_cronograma_expediente_pkey" PRIMARY KEY ("id_cronograma_au_au")
);

-- CreateIndex
CREATE INDEX "tb_maxima_autoridad_id_ente_ind_autoridad_vigente_idx" ON "tb_maxima_autoridad"("id_ente", "ind_autoridad_vigente");

-- CreateIndex
CREATE INDEX "tb_maxima_autoridad_cedula_autoridad_idx" ON "tb_maxima_autoridad"("cedula_autoridad");

-- CreateIndex
CREATE INDEX "tb_comision_contrataciones_id_ente_idx" ON "tb_comision_contrataciones"("id_ente");

-- CreateIndex
CREATE INDEX "tb_miembro_comision_id_comision_idx" ON "tb_miembro_comision"("id_comision");

-- CreateIndex
CREATE INDEX "tb_unidad_usuaria_id_ente_idx" ON "tb_unidad_usuaria"("id_ente");

-- CreateIndex
CREATE INDEX "tb_unidad_contratante_id_ente_ind_activa_idx" ON "tb_unidad_contratante"("id_ente", "ind_activa");

-- CreateIndex
CREATE INDEX "tb_modalidad_contratacion_id_ente_idx" ON "tb_modalidad_contratacion"("id_ente");

-- CreateIndex
CREATE INDEX "tb_expediente_contratacion_id_ente_estatus_proceso_au_au_idx" ON "tb_expediente_contratacion"("id_ente", "estatus_proceso_au_au");

-- CreateIndex
CREATE INDEX "tb_expediente_contratacion_cod_nomenclatura_proceso_au_au_idx" ON "tb_expediente_contratacion"("cod_nomenclatura_proceso_au_au");

-- CreateIndex
CREATE UNIQUE INDEX "tb_cronograma_expediente_id_expediente_au_au_key" ON "tb_cronograma_expediente"("id_expediente_au_au");

-- CreateIndex
CREATE INDEX "tb_cronograma_expediente_id_expediente_au_au_idx" ON "tb_cronograma_expediente"("id_expediente_au_au");

-- AddForeignKey
ALTER TABLE "tb_maxima_autoridad" ADD CONSTRAINT "tb_maxima_autoridad_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_comision_contrataciones" ADD CONSTRAINT "tb_comision_contrataciones_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_miembro_comision" ADD CONSTRAINT "tb_miembro_comision_id_comision_fkey" FOREIGN KEY ("id_comision") REFERENCES "tb_comision_contrataciones"("id_comision") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_unidad_usuaria" ADD CONSTRAINT "tb_unidad_usuaria_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_unidad_contratante" ADD CONSTRAINT "tb_unidad_contratante_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_modalidad_contratacion" ADD CONSTRAINT "tb_modalidad_contratacion_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_modalidad_fkey" FOREIGN KEY ("id_modalidad") REFERENCES "tb_modalidad_contratacion"("id_modalidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_comision_fkey" FOREIGN KEY ("id_comision") REFERENCES "tb_comision_contrataciones"("id_comision") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_unidad_usuaria_fkey" FOREIGN KEY ("id_unidad_usuaria") REFERENCES "tb_unidad_usuaria"("id_unidad_usuaria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_autoridad_fkey" FOREIGN KEY ("id_autoridad") REFERENCES "tb_maxima_autoridad"("id_autoridad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FasePreparatoria" ADD CONSTRAINT "FasePreparatoria_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_cronograma_expediente" ADD CONSTRAINT "tb_cronograma_expediente_id_expediente_au_au_fkey" FOREIGN KEY ("id_expediente_au_au") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPresupuestaria" ADD CONSTRAINT "PartidaPresupuestaria_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdquirentePliego" ADD CONSTRAINT "AdquirentePliego_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfertaPresentada" ADD CONSTRAINT "OfertaPresentada_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjudicacion" ADD CONSTRAINT "Adjudicacion_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoGenerado" ADD CONSTRAINT "DocumentoGenerado_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;
