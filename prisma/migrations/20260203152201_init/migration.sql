/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('UNIVERSITAS', 'ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('NATURAL', 'JURIDICA');

-- CreateEnum
CREATE TYPE "TipoEntidadJuridica" AS ENUM ('EMPRESA_PRIVADA', 'COOPERATIVA', 'FUNDACION', 'ASOCIACION_CIVIL', 'CONSORCIO');

-- CreateEnum
CREATE TYPE "AreaEspecialidad" AS ENUM ('OBRAS', 'BIENES', 'SERVICIOS', 'CONSULTORIA');

-- CreateEnum
CREATE TYPE "NivelContratacion" AS ENUM ('BASICO', 'INTERMEDIO', 'AVANZADO', 'EXPERTO');

-- CreateEnum
CREATE TYPE "EstatusValidacion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_REVISION');

-- CreateEnum
CREATE TYPE "TipoContratacion" AS ENUM ('OBRAS', 'BIENES', 'SERVICIOS', 'MIXTO');

-- CreateEnum
CREATE TYPE "ModalidadSeleccion" AS ENUM ('LICITACION_PUBLICA', 'CONCURSO_CERRADO', 'CONSULTA_PRECIOS', 'ADJUDICACION_DIRECTA');

-- CreateEnum
CREATE TYPE "EstatusProceso" AS ENUM ('BORRADOR', 'EN_PREPARACION', 'PUBLICADO', 'EN_EVALUACION', 'ADJUDICADO', 'CONTRATADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('PLIEGO_CONDICIONES', 'ACTA_APERTURA', 'ACTA_ADJUDICACION', 'CONTRATO', 'ADDENDUM', 'ORDEN_COMPRA', 'ACTA_RECEPCION');

-- CreateEnum
CREATE TYPE "TipoDocumentoProveedor" AS ENUM ('RIF', 'REGISTRO_MERCANTIL', 'ESTADOS_FINANCIEROS', 'REFERENCIAS_BANCARIAS', 'CERTIFICADO_SOLVENCIA_LABORAL', 'LICENCIA_MUNICIPAL', 'RNC');

-- CreateEnum
CREATE TYPE "TipoMiembro" AS ENUM ('TITULAR', 'SUPLENTE', 'COORDINADOR', 'SECRETARIO');

-- CreateEnum
CREATE TYPE "AreaRepresentacion" AS ENUM ('JURIDICA', 'TECNICA', 'FINANCIERA', 'ADMINISTRATIVA');

-- CreateEnum
CREATE TYPE "TipoGarantia" AS ENUM ('FIEL_CUMPLIMIENTO', 'ANTICIPO', 'BUENA_INVERSION_ANTICIPO');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "Universitas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Universitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntePublico" (
    "id" TEXT NOT NULL,
    "universitasId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rif" TEXT NOT NULL,
    "siglas" TEXT,
    "logoUrl" TEXT,
    "direccionFiscal" TEXT,
    "estado" TEXT,
    "municipio" TEXT,
    "parroquia" TEXT,
    "nombreUnidadAdminFinanciera" TEXT,
    "nombreUnidadTecnologia" TEXT,
    "nombreUnidadContratante" TEXT,
    "organoAdscripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "EntePublico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "enteId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supervisor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rif" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Supervisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnteSupervisor" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "EnteSupervisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaximaAutoridad" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "cargoOficial" TEXT NOT NULL,
    "datosDesignacion" TEXT,
    "leyesAtribucionesSuscribir" TEXT,
    "esDelegado" BOOLEAN NOT NULL DEFAULT false,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "nombreCompletoDelegado" TEXT,
    "cedulaDelegado" TEXT,
    "cargoOficialDelegado" TEXT,
    "datosDesignacionDelegado" TEXT,
    "leyesAtribucionesSuscribirDelegado" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MaximaAutoridad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComisionContrataciones" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "denominacion" TEXT NOT NULL,
    "datosDesignacion" TEXT,
    "tieneCertificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ComisionContrataciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiembroComision" (
    "id" TEXT NOT NULL,
    "comisionId" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "tipoMiembro" "TipoMiembro" NOT NULL,
    "areaRepresentacion" "AreaRepresentacion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MiembroComision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadUsuaria" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreResponsable" TEXT NOT NULL,
    "cargoResponsable" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "UnidadUsuaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadContratante" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreResponsable" TEXT NOT NULL,
    "cargoResponsable" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "UnidadContratante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rif" TEXT NOT NULL,
    "tipoPersona" "TipoPersona" NOT NULL,
    "tipoEntidadJuridica" "TipoEntidadJuridica",
    "estado" TEXT,
    "municipio" TEXT,
    "parroquia" TEXT,
    "direccionFiscal" TEXT,
    "telefono" TEXT,
    "nombreRepLegal" TEXT,
    "cedulaRepLegal" TEXT,
    "registroRnc" BOOLEAN NOT NULL DEFAULT false,
    "solvenciaLaboral" BOOLEAN NOT NULL DEFAULT false,
    "licenciaFuncionamientoMunicipal" BOOLEAN NOT NULL DEFAULT false,
    "actividadComercial" TEXT,
    "areaEspecialidad" "AreaEspecialidad",
    "anosExperiencia" INTEGER,
    "fechaEstadoFinanciero" TIMESTAMP(3),
    "patrimonioReportado" DECIMAL(15,2),
    "nivelContratacion" "NivelContratacion",
    "estatusValidacion" "EstatusValidacion" NOT NULL DEFAULT 'PENDIENTE',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoProveedor" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumentoProveedor" NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "observaciones" TEXT,
    "fechaCarga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentoProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpedienteContratacion" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "comisionId" TEXT NOT NULL,
    "unidadUsuariaId" TEXT NOT NULL,
    "autoridadId" TEXT NOT NULL,
    "descripcionObjeto" TEXT NOT NULL,
    "codigoNomenclatura" TEXT NOT NULL,
    "tipoContratacion" "TipoContratacion" NOT NULL,
    "montoEstimadoBs" DECIMAL(15,2) NOT NULL,
    "montoEstimadoDolar" DECIMAL(15,2),
    "valorUcauBase" DECIMAL(10,4),
    "modalidadSeleccion" "ModalidadSeleccion" NOT NULL,
    "estatusProceso" "EstatusProceso" NOT NULL DEFAULT 'BORRADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ExpedienteContratacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FasePreparatoria" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "detallesTecnicosCalidad" TEXT,
    "alcanceCantidadesObra" TEXT,
    "justificacionVentajas" TEXT,
    "origenCrsRegistro" BOOLEAN NOT NULL DEFAULT false,
    "diasValidezOferta" INTEGER,
    "autoridadAclaratorias" TEXT,
    "normativaLegal" TEXT,
    "diasVigenciaGarantiaExtension" INTEGER,
    "objetivosEspecificosLlamado" TEXT,
    "direccionRetiroPliego" TEXT,
    "horarioRetiroPliego" TEXT,
    "costoPliegoBs" DECIMAL(10,2),
    "bancoPagoPliego" TEXT,
    "cuentaPagoPliego" TEXT,
    "titularPagoPliego" TEXT,
    "condicionPluranual" TEXT,
    "viabilidadContratoMarco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FasePreparatoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronogramaExpediente" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "fechaLlamadoParticipar" TIMESTAMP(3),
    "fechaInicioDisponibilidadPliego" TIMESTAMP(3),
    "fechaFinDisponibilidadPliego" TIMESTAMP(3),
    "fechaSolicitudAclaratorias" TIMESTAMP(3),
    "fechaRespuestaAclaratorias" TIMESTAMP(3),
    "fechaModificacionPliego" TIMESTAMP(3),
    "fechaActoRecepcionAperturaSobres" TIMESTAMP(3),
    "fechaLimiteEvaluacion" TIMESTAMP(3),
    "fechaLimiteAdjudicacion" TIMESTAMP(3),
    "fechaLimiteNotificacion" TIMESTAMP(3),
    "fechaLimiteGarantias" TIMESTAMP(3),
    "fechaLimiteFirmaContrato" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CronogramaExpediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartidaPresupuestaria" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "descripcionItem" TEXT NOT NULL,
    "codigoPartida" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "cantidadRequerida" DECIMAL(12,4) NOT NULL,
    "precioUnitarioEstimado" DECIMAL(15,2) NOT NULL,
    "montoTotalRenglon" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "PartidaPresupuestaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdquirentePliego" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "fechaAdquisicion" TIMESTAMP(3) NOT NULL,
    "nombreContactoRetiro" TEXT NOT NULL,
    "datosPagoPliego" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AdquirentePliego_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfertaPresentada" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "fechaPresentacion" TIMESTAMP(3) NOT NULL,
    "nombreRepLegalActo" TEXT NOT NULL,
    "cedulaRepLegalActo" TEXT NOT NULL,
    "datosRegistroMercantilTexto" TEXT,
    "numeroSobresEntregados" INTEGER NOT NULL,
    "montoOfertaBs" DECIMAL(15,2) NOT NULL,
    "presentoGarantiaOferta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OfertaPresentada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionResultados" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "cumpleRecaudosLegales" BOOLEAN NOT NULL,
    "cumpleOfertaTecnica" BOOLEAN NOT NULL,
    "puntajeTecnicoObtenido" DECIMAL(5,2) NOT NULL,
    "puntajeEconomicoObtenido" DECIMAL(5,2) NOT NULL,
    "porcentajeVan" DECIMAL(5,2),
    "puntajeTotalFinal" DECIMAL(5,2) NOT NULL,
    "posicionPrelacion" INTEGER NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "EvaluacionResultados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjudicacion" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "ofertaGanadoraId" TEXT NOT NULL,
    "fechaActoAdjudicacion" TIMESTAMP(3) NOT NULL,
    "montoAdjudicadoBs" DECIMAL(15,2) NOT NULL,
    "criteriosSeleccionTexto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Adjudicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoFormalizado" (
    "id" TEXT NOT NULL,
    "adjudicacionId" TEXT NOT NULL,
    "supervisorId" TEXT,
    "numeroContratoFisico" TEXT NOT NULL,
    "fechaFirmaContrato" TIMESTAMP(3) NOT NULL,
    "fechaInicioVigencia" TIMESTAMP(3) NOT NULL,
    "fechaFinVigencia" TIMESTAMP(3) NOT NULL,
    "plazoEjecucionDias" INTEGER NOT NULL,
    "montoContratoTotal" DECIMAL(15,2) NOT NULL,
    "porcentajeAnticipoOtorgado" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ContratoFormalizado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarantiaContrato" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipoGarantia" "TipoGarantia" NOT NULL,
    "montoGarantia" DECIMAL(15,2) NOT NULL,
    "porcentajeAplicado" DECIMAL(5,2) NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "nombreInstitucionFinanciera" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GarantiaContrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoGenerado" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "fechaGeneracion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionDocumento" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "DocumentoGenerado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualGenerado" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "numeroVersion" INTEGER NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ManualGenerado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionEdicion" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "ultimaActividad" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionEdicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "enteId" TEXT,
    "usuarioId" TEXT,
    "tabla" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "accion" "AccionAuditoria" NOT NULL,
    "cambios" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Universitas_email_key" ON "Universitas"("email");

-- CreateIndex
CREATE INDEX "Universitas_email_idx" ON "Universitas"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EntePublico_rif_key" ON "EntePublico"("rif");

-- CreateIndex
CREATE INDEX "EntePublico_universitasId_idx" ON "EntePublico"("universitasId");

-- CreateIndex
CREATE INDEX "EntePublico_rif_idx" ON "EntePublico"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_enteId_rol_idx" ON "Usuario"("enteId", "rol");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Supervisor_rif_key" ON "Supervisor"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "Supervisor_email_key" ON "Supervisor"("email");

-- CreateIndex
CREATE INDEX "Supervisor_rif_idx" ON "Supervisor"("rif");

-- CreateIndex
CREATE INDEX "Supervisor_email_idx" ON "Supervisor"("email");

-- CreateIndex
CREATE INDEX "EnteSupervisor_enteId_activo_idx" ON "EnteSupervisor"("enteId", "activo");

-- CreateIndex
CREATE INDEX "EnteSupervisor_supervisorId_activo_idx" ON "EnteSupervisor"("supervisorId", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "EnteSupervisor_enteId_supervisorId_fechaInicio_key" ON "EnteSupervisor"("enteId", "supervisorId", "fechaInicio");

-- CreateIndex
CREATE INDEX "MaximaAutoridad_enteId_vigente_idx" ON "MaximaAutoridad"("enteId", "vigente");

-- CreateIndex
CREATE INDEX "MaximaAutoridad_cedula_idx" ON "MaximaAutoridad"("cedula");

-- CreateIndex
CREATE INDEX "ComisionContrataciones_enteId_idx" ON "ComisionContrataciones"("enteId");

-- CreateIndex
CREATE INDEX "MiembroComision_comisionId_idx" ON "MiembroComision"("comisionId");

-- CreateIndex
CREATE INDEX "UnidadUsuaria_enteId_idx" ON "UnidadUsuaria"("enteId");

-- CreateIndex
CREATE INDEX "UnidadContratante_enteId_activa_idx" ON "UnidadContratante"("enteId", "activa");

-- CreateIndex
CREATE INDEX "Proveedor_enteId_estatusValidacion_idx" ON "Proveedor"("enteId", "estatusValidacion");

-- CreateIndex
CREATE INDEX "Proveedor_rif_idx" ON "Proveedor"("rif");

-- CreateIndex
CREATE INDEX "DocumentoProveedor_proveedorId_idx" ON "DocumentoProveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "ExpedienteContratacion_enteId_estatusProceso_idx" ON "ExpedienteContratacion"("enteId", "estatusProceso");

-- CreateIndex
CREATE INDEX "ExpedienteContratacion_codigoNomenclatura_idx" ON "ExpedienteContratacion"("codigoNomenclatura");

-- CreateIndex
CREATE UNIQUE INDEX "FasePreparatoria_expedienteId_key" ON "FasePreparatoria"("expedienteId");

-- CreateIndex
CREATE INDEX "FasePreparatoria_expedienteId_idx" ON "FasePreparatoria"("expedienteId");

-- CreateIndex
CREATE UNIQUE INDEX "CronogramaExpediente_expedienteId_key" ON "CronogramaExpediente"("expedienteId");

-- CreateIndex
CREATE INDEX "CronogramaExpediente_expedienteId_idx" ON "CronogramaExpediente"("expedienteId");

-- CreateIndex
CREATE INDEX "PartidaPresupuestaria_expedienteId_idx" ON "PartidaPresupuestaria"("expedienteId");

-- CreateIndex
CREATE INDEX "AdquirentePliego_expedienteId_idx" ON "AdquirentePliego"("expedienteId");

-- CreateIndex
CREATE INDEX "AdquirentePliego_proveedorId_idx" ON "AdquirentePliego"("proveedorId");

-- CreateIndex
CREATE INDEX "OfertaPresentada_expedienteId_idx" ON "OfertaPresentada"("expedienteId");

-- CreateIndex
CREATE INDEX "OfertaPresentada_proveedorId_idx" ON "OfertaPresentada"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionResultados_ofertaId_key" ON "EvaluacionResultados"("ofertaId");

-- CreateIndex
CREATE INDEX "EvaluacionResultados_ofertaId_idx" ON "EvaluacionResultados"("ofertaId");

-- CreateIndex
CREATE UNIQUE INDEX "Adjudicacion_expedienteId_key" ON "Adjudicacion"("expedienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Adjudicacion_ofertaGanadoraId_key" ON "Adjudicacion"("ofertaGanadoraId");

-- CreateIndex
CREATE INDEX "Adjudicacion_expedienteId_idx" ON "Adjudicacion"("expedienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ContratoFormalizado_adjudicacionId_key" ON "ContratoFormalizado"("adjudicacionId");

-- CreateIndex
CREATE INDEX "ContratoFormalizado_adjudicacionId_idx" ON "ContratoFormalizado"("adjudicacionId");

-- CreateIndex
CREATE INDEX "ContratoFormalizado_numeroContratoFisico_idx" ON "ContratoFormalizado"("numeroContratoFisico");

-- CreateIndex
CREATE INDEX "GarantiaContrato_contratoId_idx" ON "GarantiaContrato"("contratoId");

-- CreateIndex
CREATE INDEX "DocumentoGenerado_expedienteId_tipoDocumento_idx" ON "DocumentoGenerado"("expedienteId", "tipoDocumento");

-- CreateIndex
CREATE INDEX "ManualGenerado_enteId_idx" ON "ManualGenerado"("enteId");

-- CreateIndex
CREATE INDEX "SessionEdicion_documentoId_bloqueado_idx" ON "SessionEdicion"("documentoId", "bloqueado");

-- CreateIndex
CREATE INDEX "SessionEdicion_usuarioId_idx" ON "SessionEdicion"("usuarioId");

-- CreateIndex
CREATE INDEX "AuditLog_tabla_registroId_idx" ON "AuditLog"("tabla", "registroId");

-- CreateIndex
CREATE INDEX "AuditLog_enteId_createdAt_idx" ON "AuditLog"("enteId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- AddForeignKey
ALTER TABLE "EntePublico" ADD CONSTRAINT "EntePublico_universitasId_fkey" FOREIGN KEY ("universitasId") REFERENCES "Universitas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnteSupervisor" ADD CONSTRAINT "EnteSupervisor_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnteSupervisor" ADD CONSTRAINT "EnteSupervisor_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Supervisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaximaAutoridad" ADD CONSTRAINT "MaximaAutoridad_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComisionContrataciones" ADD CONSTRAINT "ComisionContrataciones_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiembroComision" ADD CONSTRAINT "MiembroComision_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "ComisionContrataciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadUsuaria" ADD CONSTRAINT "UnidadUsuaria_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadContratante" ADD CONSTRAINT "UnidadContratante_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoProveedor" ADD CONSTRAINT "DocumentoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteContratacion" ADD CONSTRAINT "ExpedienteContratacion_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteContratacion" ADD CONSTRAINT "ExpedienteContratacion_comisionId_fkey" FOREIGN KEY ("comisionId") REFERENCES "ComisionContrataciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteContratacion" ADD CONSTRAINT "ExpedienteContratacion_unidadUsuariaId_fkey" FOREIGN KEY ("unidadUsuariaId") REFERENCES "UnidadUsuaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpedienteContratacion" ADD CONSTRAINT "ExpedienteContratacion_autoridadId_fkey" FOREIGN KEY ("autoridadId") REFERENCES "MaximaAutoridad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FasePreparatoria" ADD CONSTRAINT "FasePreparatoria_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "ExpedienteContratacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CronogramaExpediente" ADD CONSTRAINT "CronogramaExpediente_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "ExpedienteContratacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPresupuestaria" ADD CONSTRAINT "PartidaPresupuestaria_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "ExpedienteContratacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdquirentePliego" ADD CONSTRAINT "AdquirentePliego_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "ExpedienteContratacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdquirentePliego" ADD CONSTRAINT "AdquirentePliego_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfertaPresentada" ADD CONSTRAINT "OfertaPresentada_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "ExpedienteContratacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfertaPresentada" ADD CONSTRAINT "OfertaPresentada_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionResultados" ADD CONSTRAINT "EvaluacionResultados_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "OfertaPresentada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjudicacion" ADD CONSTRAINT "Adjudicacion_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "ExpedienteContratacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjudicacion" ADD CONSTRAINT "Adjudicacion_ofertaGanadoraId_fkey" FOREIGN KEY ("ofertaGanadoraId") REFERENCES "OfertaPresentada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoFormalizado" ADD CONSTRAINT "ContratoFormalizado_adjudicacionId_fkey" FOREIGN KEY ("adjudicacionId") REFERENCES "Adjudicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiaContrato" ADD CONSTRAINT "GarantiaContrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoFormalizado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoGenerado" ADD CONSTRAINT "DocumentoGenerado_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "ExpedienteContratacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualGenerado" ADD CONSTRAINT "ManualGenerado_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionEdicion" ADD CONSTRAINT "SessionEdicion_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoGenerado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionEdicion" ADD CONSTRAINT "SessionEdicion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
