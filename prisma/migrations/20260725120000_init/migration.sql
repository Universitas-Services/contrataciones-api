-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('UNIVERSITAS', 'ADMIN_ENTE', 'EJECUTOR', 'VISUALIZADOR', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('NATURAL', 'JURIDICA', 'ORGANO_ENTE_PUBLICO');

-- CreateEnum
CREATE TYPE "TipoEntidadJuridica" AS ENUM ('COMPANIA_ANONIMA', 'ASOCIACION_CIVIL', 'SRL', 'FUNDACION', 'COOPERATIVA', 'PYME', 'SOCIEDAD_CIVIL');

-- CreateEnum
CREATE TYPE "AreaEspecialidad" AS ENUM ('BIENES', 'OBRAS', 'SERVICIOS');

-- CreateEnum
CREATE TYPE "NivelContratacion" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "EstatusValidacion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_REVISION');

-- CreateEnum
CREATE TYPE "TipoContratacion" AS ENUM ('OBRAS', 'BIENES', 'SERVICIOS', 'MIXTO');

-- CreateEnum
CREATE TYPE "ModalidadSeleccion" AS ENUM ('LICITACION_PUBLICA', 'CONCURSO_CERRADO', 'CONSULTA_PRECIOS', 'ADJUDICACION_DIRECTA', 'MODALIDADES_EXCLUIDAS');

-- CreateEnum
CREATE TYPE "EstatusProceso" AS ENUM ('BORRADOR', 'EN_PREPARACION', 'PUBLICADO', 'EN_EVALUACION', 'ADJUDICADO', 'CONTRATADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('PLIEGO_CONDICIONES', 'ACTA_APERTURA', 'ACTA_ADJUDICACION', 'CONTRATO', 'ADDENDUM', 'ORDEN_COMPRA', 'ACTA_RECEPCION', 'ACTA_INICIO', 'LLAMADO_PARTICIPAR', 'REGISTRO_ADQUIRENTES', 'LISTA_COTEJO', 'INFORME_RECOMENDACION', 'NOTIFICACION_ADJUDICADO', 'NOTIFICACION_NO_ADJUDICADO');

-- CreateEnum
CREATE TYPE "TipoDocumentoProveedor" AS ENUM ('RIF', 'ACTA_CONSTITUTIVA', 'CERTIFICADO_SOLVENCIA_LABORAL', 'LICENCIA_MUNICIPAL', 'RNC', 'CEDULA', 'ISLR', 'CURRICULUM', 'TITULO_UNIVERSITARIO', 'RESOLUCION_DESIGNACION', 'GACETA_CREACION');

-- CreateEnum
CREATE TYPE "TipoMiembro" AS ENUM ('Miembro principal', 'Miembro suplente', 'Coordinador (a)', 'Secretario (a)');

-- CreateEnum
CREATE TYPE "AreaRepresentacion" AS ENUM ('Área jurídica', 'Área técnica', 'Área económica-financiera', 'Secretario (a)');

-- CreateEnum
CREATE TYPE "TipoGarantia" AS ENUM ('FIEL_CUMPLIMIENTO', 'ANTICIPO', 'BUENA_INVERSION_ANTICIPO');

-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW');

-- CreateEnum
CREATE TYPE "EstadoTicket" AS ENUM ('ABIERTO', 'EN_PROGRESO', 'RESUELTO', 'CERRADO');

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
    "rif" TEXT,
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
    "datosConfirmados" BOOLEAN NOT NULL DEFAULT false,
    "ciudad" TEXT,

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
    "supervisorId" TEXT,
    "cambioPasswordDefault" BOOLEAN NOT NULL DEFAULT false,
    "resetPasswordExpires" TIMESTAMP(3),
    "resetPasswordToken" TEXT,
    "passwordPerdido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supervisor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rif" TEXT,
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
CREATE TABLE "SupervisorAsignacion" (
    "id" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SupervisorAsignacion_pkey" PRIMARY KEY ("id")
);

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
    "ind_activa" BOOLEAN NOT NULL DEFAULT true,
    "correo_electronico_comision" VARCHAR(100),
    "telefono_comision" VARCHAR(50),

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
    "cedula_respo_unidad_usuaria" TEXT,
    "datos_designacion_unidad_usuaria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "ind_activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tb_unidad_usuaria_pkey" PRIMARY KEY ("id_unidad_usuaria")
);

-- CreateTable
CREATE TABLE "tb_unidad_contratante" (
    "id_unidad_contratante" TEXT NOT NULL,
    "id_ente" TEXT NOT NULL,
    "nom_unidad_contratante" TEXT NOT NULL,
    "nom_responsable_unidad" TEXT NOT NULL,
    "nom_responsable_unidad_contratante" TEXT,
    "cargo_responsable" TEXT NOT NULL,
    "cedula_respo_unidad_contratante" TEXT,
    "datos_designacion_unidad_contratante" TEXT,
    "ind_activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_unidad_contratante_pkey" PRIMARY KEY ("id_unidad_contratante")
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
    "datosRegistroMercantil" TEXT,
    "fechaUltimaAprobacion" TIMESTAMP(3),
    "islr_proveedor" BOOLEAN DEFAULT false,
    "cedula_natural_proveedor" INTEGER,
    "nombre_autoridad_proveedor" TEXT,
    "cedula_autoridad_proveedor" INTEGER,
    "datos_designacion_autoridad_proveedor" TEXT,

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
    "id_comision" TEXT,
    "id_unidad_usuaria" TEXT,
    "id_autoridad" TEXT,
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
    "ind_firma_delegado_au_au" BOOLEAN NOT NULL DEFAULT false,
    "modalidad_concurso_abierto" VARCHAR(100),
    "numeral_causal_procedencia_cd" VARCHAR(10),
    "causal_procedencia_cd" TEXT,
    "id_unidad_contratante" TEXT,

    CONSTRAINT "tb_expediente_contratacion_pkey" PRIMARY KEY ("id_expediente_au_au")
);

-- CreateTable
CREATE TABLE "tb_fase_preparatoria" (
    "id_fase_preparatoria" TEXT NOT NULL,
    "id_expediente" TEXT NOT NULL,
    "datos_acto_autorizacion_inicio" VARCHAR(255),
    "fec_acta_inicio" TIMESTAMP(3),
    "detalles_tecnicos_calidad" TEXT,
    "alcance_cantidades_obra" TEXT,
    "justificacion_ventajas" TEXT,
    "ind_origen_crs_registro" BOOLEAN DEFAULT false,
    "dias_validez_oferta" INTEGER,
    "autoridad_aclaratorias" VARCHAR(255),
    "normativa_legal" TEXT,
    "dias_vigencia_garantia_ext" INTEGER,
    "objetivos_especificos_1" VARCHAR(255),
    "objetivos_especificos_2" VARCHAR(255),
    "objetivos_especificos_3" VARCHAR(255),
    "direccion_retiro_pliego" VARCHAR(255),
    "horario_retiro_pliego" VARCHAR(255),
    "pliego_gratuito" BOOLEAN NOT NULL DEFAULT true,
    "costo_pliego_bs" DECIMAL(10,2),
    "banco_pago_pliego" VARCHAR(100),
    "cuenta_pago_pliego" VARCHAR(50),
    "titular_pago_pliego" VARCHAR(100),
    "hora_acto_recep_aper" VARCHAR(50),
    "correo_comision" VARCHAR(100),
    "telefono_comision" VARCHAR(50),
    "condicion_plurianual" BOOLEAN,
    "viabilidad_contrato_marco" BOOLEAN,
    "justificacion_contrato_marco_au_au" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tb_fase_preparatoria_pkey" PRIMARY KEY ("id_fase_preparatoria")
);

-- CreateTable
CREATE TABLE "tb_presupuesto_items" (
    "id_presupuesto_item" TEXT NOT NULL,
    "id_expediente" TEXT NOT NULL,
    "descripcion_item" VARCHAR(255) NOT NULL,
    "codigo_partida" VARCHAR(50) NOT NULL,
    "unidad_medida" VARCHAR(50) NOT NULL,
    "cantidad_requerida" DECIMAL(10,2) NOT NULL,
    "precio_unitario_estimado" DECIMAL(15,2) NOT NULL,
    "total_item" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tb_presupuesto_items_pkey" PRIMARY KEY ("id_presupuesto_item")
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
    "ind_tiene_conflicto_festivo" BOOLEAN NOT NULL DEFAULT false,
    "fec_verificacion_recaudos" TIMESTAMP(3),

    CONSTRAINT "tb_cronograma_expediente_pkey" PRIMARY KEY ("id_cronograma_au_au")
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
CREATE TABLE "tb_adquirente_pliego" (
    "id_adquirente_au_au" TEXT NOT NULL,
    "id_expediente_au_au" TEXT NOT NULL,
    "id_proveedor" TEXT,
    "fec_adquisicion_pliego_au_au" TIMESTAMP(3) NOT NULL,
    "datos_pago_pliego_au_au" VARCHAR(255),
    "nombre_proveedor_adquiriente_au_au" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "correo_proveedor_adquirente_au_au" VARCHAR(100) NOT NULL,
    "direccion_fiscal_proveedor_adquirente_au_au" VARCHAR(255) NOT NULL,
    "telefono_proveedor_adquirente_au_au" VARCHAR(100) NOT NULL,

    CONSTRAINT "tb_adquirente_pliego_pkey" PRIMARY KEY ("id_adquirente_au_au")
);

-- CreateTable
CREATE TABLE "OfertaPresentada" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "cedula_rep_legal_oferente_au_au" VARCHAR(20) NOT NULL,
    "datos_registro_mercantil_proveedor_oferente_au_au" TEXT,
    "monto_oferta_bs_au_au" DECIMAL(15,2) NOT NULL,
    "nombre_proveedor_oferente_au_au" VARCHAR(255) NOT NULL,
    "nombre_rep_legal_oferente_au_au" VARCHAR(255) NOT NULL,
    "num_sobres_entregados_au_au" INTEGER NOT NULL,
    "rif_proveedor_oferente_au_au" VARCHAR(20) NOT NULL,
    "correo_proveedor_oferente_au_au" VARCHAR(150),

    CONSTRAINT "OfertaPresentada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_evaluacion_resultados" (
    "id" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "nombre_proveedor_evaluado_au_au" VARCHAR(255) NOT NULL,
    "rif_proveedor_evaluado_au_au" VARCHAR(20) NOT NULL,
    "nombre_rep_legal_evaluado_au_au" VARCHAR(255) NOT NULL,
    "cedula_rep_legal_evaluado_au_au" VARCHAR(20) NOT NULL,
    "oferente_calificado_legal_au_au" BOOLEAN,
    "justificacion_calificado_legal_au_au" TEXT,
    "indice_liquidez_au_au" DECIMAL(10,4),
    "indice_solvencia_au_au" DECIMAL(10,4),
    "oferente_calificado_financiera_au_au" BOOLEAN,
    "justificacion_calificado_financiera_au_au" TEXT,
    "actividad_comercial_au_au" DECIMAL(5,2),
    "relacion_suministros_au_au" DECIMAL(5,2),
    "referencias_comerciales_puntaje_au_au" DECIMAL(5,2),
    "total_calif_tecnica_au_au" DECIMAL(6,2),
    "oferente_calificado_tecnica_au_au" BOOLEAN,
    "justificacion_calificado_tecnica_au_au" TEXT,
    "oferente_calificado_au_au" BOOLEAN,
    "motivo_descalificacion_oferente_au_au" TEXT,
    "items_descalificacion_oferente_au_au" TEXT,
    "oferente_evaluado_tecnico_au_au" BOOLEAN,
    "justificacion_evaluado_tecnico_au_au" TEXT,
    "posicion_prelacion_au_au" VARCHAR(50),
    "total_tecnica_au_au" DECIMAL(5,2),
    "total_economica_au_au" DECIMAL(5,2),
    "total_van_au_au" DECIMAL(5,2),
    "total_evaluacion_oferente_au_au" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_evaluacion_resultados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_sobre_1" (
    "id" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "carta_manifestacion_voluntad_au_au" BOOLEAN,
    "obs_carta_manifestacion_voluntad_au_au" TEXT,
    "carta_autorizacion_au_au" BOOLEAN,
    "obs_carta_autorizacion_au_au" TEXT,
    "doc_constitutivo_au_au" BOOLEAN,
    "obs_doc_constitutivo_au_au" TEXT,
    "copia_rif_vigente_au_au" BOOLEAN,
    "obs_copia_rif_vigente_au_au" TEXT,
    "certificado_rnc_au_au" BOOLEAN,
    "obs_certificado_rnc_au_au" TEXT,
    "solvencia_laboral_au_au" BOOLEAN,
    "obs_solvencia_laboral_au_au" TEXT,
    "declaracion_socios_no_inhabilitados_au_au" BOOLEAN,
    "obs_declaracion_socios_no_inhabilitados_au_au" TEXT,
    "declaracion_no_deudas_ente_au_au" BOOLEAN,
    "obs_declaracion_no_deudas_ente_au_au" TEXT,
    "declaracion_no_impedimentos_lcp_au_au" BOOLEAN,
    "obs_declaracion_no_impedimentos_lcp_au_au" TEXT,
    "declaracion_info_financiera_au_au" BOOLEAN,
    "obs_declaracion_info_financiera_au_au" TEXT,
    "relacion_servicios_prestados_au_au" BOOLEAN,
    "obs_relacion_servicios_prestados_au_au" TEXT,
    "evaluacion_desempenio_au_au" BOOLEAN,
    "obs_evaluacion_desempenio_au_au" TEXT,
    "referencias_comerciales_au_au" BOOLEAN,
    "obs_referencias_comerciales_au_au" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_sobre_1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_sobre_2" (
    "id" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "oferta_tecnico_economica_au_au" BOOLEAN,
    "obs_oferta_tecnico_economica_au_au" TEXT,
    "carta_oferta_au_au" BOOLEAN,
    "obs_carta_oferta_au_au" TEXT,
    "declaracion_capacidad_financiera_au_au" BOOLEAN,
    "obs_declaracion_capacidad_financiera_au_au" TEXT,
    "declaracion_compromiso_resp_social_au_au" BOOLEAN,
    "obs_declaracion_compromiso_resp_social_au_au" TEXT,
    "garantia_mantenimiento_oferta_au_au" BOOLEAN,
    "obs_garantia_mantenimiento_oferta_au_au" TEXT,
    "declaracion_autocalculo_van_au_au" BOOLEAN,
    "obs_declaracion_autocalculo_van_au_au" TEXT,
    "carta_notificaciones_au_au" BOOLEAN,
    "obs_carta_notificaciones_au_au" TEXT,
    "garantia_fiel_cumpl_au_au" BOOLEAN,
    "obs_garantia_fiel_cumpl_au_au" TEXT,
    "carta_compromiso_au_au" BOOLEAN,
    "obs_carta_compromiso_au_au" TEXT,
    "fianza_laboral_au_au" BOOLEAN,
    "obs_fianza_laboral_au_au" TEXT,
    "experiencia_personal_tecnico_au_au" BOOLEAN,
    "obs_experiencia_personal_tecnico_au_au" TEXT,
    "criterio_1_evaluacion_au_au" VARCHAR(255),
    "puntuacion_criterio_1_au_au" DECIMAL(5,2),
    "criterio_2_evaluacion_au_au" VARCHAR(255),
    "puntuacion_criterio_2_au_au" DECIMAL(5,2),
    "criterio_3_evaluacion_au_au" VARCHAR(255),
    "puntuacion_criterio_3_au_au" DECIMAL(5,2),
    "criterio_4_evaluacion_au_au" VARCHAR(255),
    "puntuacion_criterio_4_au_au" DECIMAL(5,2),
    "monto_oferta_au_au" DECIMAL(15,2),
    "porcentaje_van_au_au" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_sobre_2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_informe_recomendacion" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "actualizacion_presupuesto_au_au" BOOLEAN,
    "monto_nuevo_presupuesto_au_au" DECIMAL(15,2),
    "justificacion_actualizacion_presupuesto_au_au" TEXT,
    "ind_verificado_garantia_au_au" BOOLEAN,
    "ind_verificado_crs_au_au" BOOLEAN,
    "observacion_formalidades_au_au" BOOLEAN,
    "omision_formalidades_au_au" TEXT,
    "subsanacion_acto_au_au" TEXT,
    "datos_acto_subsanacion_au_au" TEXT,
    "plazo_ejecucion_oferta_ganadora_au_au" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_informe_recomendacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjudicacion" (
    "id" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "ofertaGanadoraId" TEXT NOT NULL,
    "fechaActoAdjudicacion" TIMESTAMP(3) NOT NULL,
    "montoAdjudicadoBs" DECIMAL(15,2) NOT NULL,
    "partida_presupuest_gasto_au_au" VARCHAR(50) NOT NULL,
    "monto_crs_bs_au_au" DECIMAL(10,2) NOT NULL,
    "referencia_recomendacion_au_au" TEXT NOT NULL,
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
    "fec_inicio_vigencia_au_au" TIMESTAMP(3) NOT NULL,
    "fec_fin_vigencia_au_au" TIMESTAMP(3) NOT NULL,
    "monto_contrato_bs_au_au" DECIMAL(15,2) NOT NULL,
    "monto_contrato_bs_letras_au_au" VARCHAR(255),
    "valor_ucau_contrato_au_au" DECIMAL(15,2) NOT NULL,
    "plazo_ejecucion_dias_au_au" INTEGER NOT NULL,
    "plazo_garantia_calidad_funcionamiento_au_au" VARCHAR(255) NOT NULL,
    "nombre_supervisor_au_au" VARCHAR(500) NOT NULL,
    "cedula_supervisor_au_au" VARCHAR(50) NOT NULL,
    "cargo_supervisor_au_au" VARCHAR(255) NOT NULL,
    "criterio_aceptacion_contrato_au_au" VARCHAR(500) NOT NULL,
    "plazo_consignacion_facturas_au_au" INTEGER NOT NULL,
    "monto_fiel_cumplimiento_bs_au_au" DECIMAL(20,2) NOT NULL,
    "monto_fiel_cump_bs_letras_au_au" VARCHAR(255),
    "requiere_garantia_laboral_au_au" BOOLEAN NOT NULL,
    "porcentaje_garantia_laboral_au_au" DECIMAL(5,2),
    "monto_garantia_laboral_bs_au_au" DECIMAL(15,2),
    "monto_garantia_lab_bs_letras_au_au" VARCHAR(255),
    "poliza_responsabilidad_civil_au_au" BOOLEAN NOT NULL,
    "porcentaje_responsabilidad_civil_au_au" DECIMAL(5,2),
    "monto_responsabilidad_civil_bs_au_au" DECIMAL(15,2),
    "monto_resp_civil_bs_letras_au_au" VARCHAR(255),
    "anticipo_contrato_au_au" BOOLEAN NOT NULL,
    "forma_cumplimiento_crs_au_au" VARCHAR(255) NOT NULL,
    "unidad_resp_cumplimiento_crs_au_au" VARCHAR(255) NOT NULL,
    "porcentajeAnticipoOtorgado" DECIMAL(5,2),
    "porcentaje_multa_diaria_au_au" DECIMAL(5,2) NOT NULL,
    "base_calculo_multa_diaria_au_au" DECIMAL(15,2) NOT NULL,
    "plazo_regularizar_incumplimiento_au_au" VARCHAR(50) NOT NULL,
    "porcentaje_procedimiento_rescision_au_au" DECIMAL(5,2) NOT NULL,
    "formula_ajuste_precios_au_au" VARCHAR(255) NOT NULL,
    "evaluacion_desempeño_au_au" VARCHAR(255) NOT NULL,
    "garantia_post_ejecucion_au_au" VARCHAR(255) NOT NULL,
    "lugar_tribunal_au_au" VARCHAR(255) NOT NULL,
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
    "estaDesactualizado" BOOLEAN NOT NULL DEFAULT false,
    "evaluacionId" TEXT,

    CONSTRAINT "DocumentoGenerado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualGenerado" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "descripcion" TEXT,
    "tipoManual" TEXT NOT NULL,
    "tituloManual" TEXT NOT NULL,
    "updatedBy" TEXT,
    "versionDocumento" INTEGER NOT NULL DEFAULT 1,
    "estaDesactualizado" BOOLEAN NOT NULL DEFAULT false,
    "esVersionVigente" BOOLEAN NOT NULL DEFAULT true,
    "motivoDesactualizacion" TEXT,
    "snapshotDatos" JSONB,

    CONSTRAINT "ManualGenerado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_pliego_generado" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "expedienteId" TEXT NOT NULL,
    "tituloPliego" TEXT NOT NULL,
    "descripcion" TEXT,
    "urlArchivo" TEXT NOT NULL,
    "versionDocumento" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "estaDesactualizado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tb_pliego_generado_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "tb_ticket_soporte" (
    "id" TEXT NOT NULL,
    "enteId" TEXT NOT NULL,
    "creadorId" TEXT NOT NULL,
    "asunto" VARCHAR(255) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoTicket" NOT NULL DEFAULT 'ABIERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tb_ticket_soporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_mensaje_ticket" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "remitenteId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_mensaje_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_dia_no_laborable_ente" (
    "id" TEXT NOT NULL,
    "id_ente" TEXT NOT NULL,
    "fec_dia_no_laborable" TIMESTAMP(3),
    "fec_recurrente_mmdd" TEXT,
    "ind_es_recurrente" BOOLEAN NOT NULL DEFAULT false,
    "desc_dia_no_laborable" VARCHAR(255) NOT NULL,
    "ind_activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "tb_dia_no_laborable_ente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tb_alerta_cronograma" (
    "id" TEXT NOT NULL,
    "id_cronograma" TEXT NOT NULL,
    "id_dia_no_laborable" TEXT NOT NULL,
    "campo_afectado" VARCHAR(100) NOT NULL,
    "fec_conflicto" TIMESTAMP(3) NOT NULL,
    "ind_resuelta" BOOLEAN NOT NULL DEFAULT false,
    "resuelta_por" TEXT,
    "fec_resuelta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tb_alerta_cronograma_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Usuario_resetPasswordToken_key" ON "Usuario"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "Usuario_enteId_rol_idx" ON "Usuario"("enteId", "rol");

-- CreateIndex
CREATE INDEX "Usuario_supervisorId_idx" ON "Usuario"("supervisorId");

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
CREATE INDEX "SupervisorAsignacion_supervisorId_idx" ON "SupervisorAsignacion"("supervisorId");

-- CreateIndex
CREATE INDEX "SupervisorAsignacion_enteId_idx" ON "SupervisorAsignacion"("enteId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorAsignacion_supervisorId_enteId_key" ON "SupervisorAsignacion"("supervisorId", "enteId");

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
CREATE INDEX "Proveedor_enteId_estatusValidacion_idx" ON "Proveedor"("enteId", "estatusValidacion");

-- CreateIndex
CREATE INDEX "Proveedor_rif_idx" ON "Proveedor"("rif");

-- CreateIndex
CREATE INDEX "DocumentoProveedor_proveedorId_idx" ON "DocumentoProveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "tb_modalidad_contratacion_id_ente_idx" ON "tb_modalidad_contratacion"("id_ente");

-- CreateIndex
CREATE INDEX "tb_expediente_contratacion_id_ente_estatus_proceso_au_au_idx" ON "tb_expediente_contratacion"("id_ente", "estatus_proceso_au_au");

-- CreateIndex
CREATE INDEX "tb_expediente_contratacion_cod_nomenclatura_proceso_au_au_idx" ON "tb_expediente_contratacion"("cod_nomenclatura_proceso_au_au");

-- CreateIndex
CREATE UNIQUE INDEX "tb_fase_preparatoria_id_expediente_key" ON "tb_fase_preparatoria"("id_expediente");

-- CreateIndex
CREATE INDEX "tb_fase_preparatoria_id_expediente_idx" ON "tb_fase_preparatoria"("id_expediente");

-- CreateIndex
CREATE INDEX "tb_presupuesto_items_id_expediente_idx" ON "tb_presupuesto_items"("id_expediente");

-- CreateIndex
CREATE UNIQUE INDEX "tb_cronograma_expediente_id_expediente_au_au_key" ON "tb_cronograma_expediente"("id_expediente_au_au");

-- CreateIndex
CREATE INDEX "tb_cronograma_expediente_id_expediente_au_au_idx" ON "tb_cronograma_expediente"("id_expediente_au_au");

-- CreateIndex
CREATE INDEX "PartidaPresupuestaria_expedienteId_idx" ON "PartidaPresupuestaria"("expedienteId");

-- CreateIndex
CREATE INDEX "tb_adquirente_pliego_id_expediente_au_au_idx" ON "tb_adquirente_pliego"("id_expediente_au_au");

-- CreateIndex
CREATE INDEX "tb_adquirente_pliego_id_proveedor_idx" ON "tb_adquirente_pliego"("id_proveedor");

-- CreateIndex
CREATE INDEX "OfertaPresentada_expedienteId_idx" ON "OfertaPresentada"("expedienteId");

-- CreateIndex
CREATE INDEX "OfertaPresentada_proveedorId_idx" ON "OfertaPresentada"("proveedorId");

-- CreateIndex
CREATE INDEX "OfertaPresentada_expedienteId_rif_proveedor_oferente_au_au_idx" ON "OfertaPresentada"("expedienteId", "rif_proveedor_oferente_au_au");

-- CreateIndex
CREATE UNIQUE INDEX "tb_evaluacion_resultados_ofertaId_key" ON "tb_evaluacion_resultados"("ofertaId");

-- CreateIndex
CREATE INDEX "tb_evaluacion_resultados_ofertaId_idx" ON "tb_evaluacion_resultados"("ofertaId");

-- CreateIndex
CREATE UNIQUE INDEX "tb_sobre_1_evaluacionId_key" ON "tb_sobre_1"("evaluacionId");

-- CreateIndex
CREATE UNIQUE INDEX "tb_sobre_2_evaluacionId_key" ON "tb_sobre_2"("evaluacionId");

-- CreateIndex
CREATE UNIQUE INDEX "tb_informe_recomendacion_expedienteId_key" ON "tb_informe_recomendacion"("expedienteId");

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
CREATE INDEX "DocumentoGenerado_evaluacionId_idx" ON "DocumentoGenerado"("evaluacionId");

-- CreateIndex
CREATE INDEX "ManualGenerado_enteId_tipoManual_idx" ON "ManualGenerado"("enteId", "tipoManual");

-- CreateIndex
CREATE INDEX "ManualGenerado_createdAt_idx" ON "ManualGenerado"("createdAt");

-- CreateIndex
CREATE INDEX "ManualGenerado_enteId_esVersionVigente_idx" ON "ManualGenerado"("enteId", "esVersionVigente");

-- CreateIndex
CREATE INDEX "tb_pliego_generado_enteId_idx" ON "tb_pliego_generado"("enteId");

-- CreateIndex
CREATE INDEX "tb_pliego_generado_expedienteId_idx" ON "tb_pliego_generado"("expedienteId");

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

-- CreateIndex
CREATE INDEX "tb_ticket_soporte_enteId_estado_idx" ON "tb_ticket_soporte"("enteId", "estado");

-- CreateIndex
CREATE INDEX "tb_ticket_soporte_creadorId_idx" ON "tb_ticket_soporte"("creadorId");

-- CreateIndex
CREATE INDEX "tb_mensaje_ticket_ticketId_createdAt_idx" ON "tb_mensaje_ticket"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "tb_mensaje_ticket_remitenteId_idx" ON "tb_mensaje_ticket"("remitenteId");

-- CreateIndex
CREATE INDEX "tb_dia_no_laborable_ente_id_ente_ind_activo_idx" ON "tb_dia_no_laborable_ente"("id_ente", "ind_activo");

-- CreateIndex
CREATE UNIQUE INDEX "tb_dia_no_laborable_ente_id_ente_fec_dia_no_laborable_key" ON "tb_dia_no_laborable_ente"("id_ente", "fec_dia_no_laborable");

-- CreateIndex
CREATE UNIQUE INDEX "tb_dia_no_laborable_ente_id_ente_fec_recurrente_mmdd_key" ON "tb_dia_no_laborable_ente"("id_ente", "fec_recurrente_mmdd");

-- CreateIndex
CREATE INDEX "tb_alerta_cronograma_id_cronograma_ind_resuelta_idx" ON "tb_alerta_cronograma"("id_cronograma", "ind_resuelta");

-- CreateIndex
CREATE INDEX "tb_alerta_cronograma_id_dia_no_laborable_idx" ON "tb_alerta_cronograma"("id_dia_no_laborable");

-- AddForeignKey
ALTER TABLE "EntePublico" ADD CONSTRAINT "EntePublico_universitasId_fkey" FOREIGN KEY ("universitasId") REFERENCES "Universitas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Supervisor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnteSupervisor" ADD CONSTRAINT "EnteSupervisor_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnteSupervisor" ADD CONSTRAINT "EnteSupervisor_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Supervisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAsignacion" ADD CONSTRAINT "SupervisorAsignacion_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorAsignacion" ADD CONSTRAINT "SupervisorAsignacion_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoProveedor" ADD CONSTRAINT "DocumentoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_modalidad_contratacion" ADD CONSTRAINT "tb_modalidad_contratacion_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_autoridad_fkey" FOREIGN KEY ("id_autoridad") REFERENCES "tb_maxima_autoridad"("id_autoridad") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_comision_fkey" FOREIGN KEY ("id_comision") REFERENCES "tb_comision_contrataciones"("id_comision") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_modalidad_fkey" FOREIGN KEY ("id_modalidad") REFERENCES "tb_modalidad_contratacion"("id_modalidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_unidad_usuaria_fkey" FOREIGN KEY ("id_unidad_usuaria") REFERENCES "tb_unidad_usuaria"("id_unidad_usuaria") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_expediente_contratacion" ADD CONSTRAINT "tb_expediente_contratacion_id_unidad_contratante_fkey" FOREIGN KEY ("id_unidad_contratante") REFERENCES "tb_unidad_contratante"("id_unidad_contratante") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_fase_preparatoria" ADD CONSTRAINT "tb_fase_preparatoria_id_expediente_fkey" FOREIGN KEY ("id_expediente") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_presupuesto_items" ADD CONSTRAINT "tb_presupuesto_items_id_expediente_fkey" FOREIGN KEY ("id_expediente") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_cronograma_expediente" ADD CONSTRAINT "tb_cronograma_expediente_id_expediente_au_au_fkey" FOREIGN KEY ("id_expediente_au_au") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartidaPresupuestaria" ADD CONSTRAINT "PartidaPresupuestaria_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_adquirente_pliego" ADD CONSTRAINT "tb_adquirente_pliego_id_expediente_au_au_fkey" FOREIGN KEY ("id_expediente_au_au") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_adquirente_pliego" ADD CONSTRAINT "tb_adquirente_pliego_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfertaPresentada" ADD CONSTRAINT "OfertaPresentada_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfertaPresentada" ADD CONSTRAINT "OfertaPresentada_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_evaluacion_resultados" ADD CONSTRAINT "tb_evaluacion_resultados_ofertaId_fkey" FOREIGN KEY ("ofertaId") REFERENCES "OfertaPresentada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_sobre_1" ADD CONSTRAINT "tb_sobre_1_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "tb_evaluacion_resultados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_sobre_2" ADD CONSTRAINT "tb_sobre_2_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "tb_evaluacion_resultados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_informe_recomendacion" ADD CONSTRAINT "tb_informe_recomendacion_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjudicacion" ADD CONSTRAINT "Adjudicacion_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjudicacion" ADD CONSTRAINT "Adjudicacion_ofertaGanadoraId_fkey" FOREIGN KEY ("ofertaGanadoraId") REFERENCES "OfertaPresentada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoFormalizado" ADD CONSTRAINT "ContratoFormalizado_adjudicacionId_fkey" FOREIGN KEY ("adjudicacionId") REFERENCES "Adjudicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarantiaContrato" ADD CONSTRAINT "GarantiaContrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoFormalizado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoGenerado" ADD CONSTRAINT "DocumentoGenerado_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "tb_evaluacion_resultados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoGenerado" ADD CONSTRAINT "DocumentoGenerado_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualGenerado" ADD CONSTRAINT "ManualGenerado_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_pliego_generado" ADD CONSTRAINT "tb_pliego_generado_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_pliego_generado" ADD CONSTRAINT "tb_pliego_generado_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "tb_expediente_contratacion"("id_expediente_au_au") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionEdicion" ADD CONSTRAINT "SessionEdicion_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoGenerado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionEdicion" ADD CONSTRAINT "SessionEdicion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_ticket_soporte" ADD CONSTRAINT "tb_ticket_soporte_enteId_fkey" FOREIGN KEY ("enteId") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_ticket_soporte" ADD CONSTRAINT "tb_ticket_soporte_creadorId_fkey" FOREIGN KEY ("creadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_mensaje_ticket" ADD CONSTRAINT "tb_mensaje_ticket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tb_ticket_soporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_mensaje_ticket" ADD CONSTRAINT "tb_mensaje_ticket_remitenteId_fkey" FOREIGN KEY ("remitenteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_dia_no_laborable_ente" ADD CONSTRAINT "tb_dia_no_laborable_ente_id_ente_fkey" FOREIGN KEY ("id_ente") REFERENCES "EntePublico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_alerta_cronograma" ADD CONSTRAINT "tb_alerta_cronograma_id_cronograma_fkey" FOREIGN KEY ("id_cronograma") REFERENCES "tb_cronograma_expediente"("id_cronograma_au_au") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tb_alerta_cronograma" ADD CONSTRAINT "tb_alerta_cronograma_id_dia_no_laborable_fkey" FOREIGN KEY ("id_dia_no_laborable") REFERENCES "tb_dia_no_laborable_ente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

