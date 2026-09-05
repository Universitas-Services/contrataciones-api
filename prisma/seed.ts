import {
  PrismaClient,
  TipoMiembro,
  AreaRepresentacion,
  RolUsuario,
  TipoContratacion,
  ModalidadSeleccion,
  EstatusProceso,
  EstadoMicromodulo,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const LOGO_NEUTRO =
  'https://res.cloudinary.com/da86ka5ip/image/upload/v1743519586/universitas/placeholder_logo.png';

/**
 * Este seeder BORRA TODA la base antes de poblarla. Para que no pueda
 * ejecutarse por accidente contra un entorno remoto (Render, staging), sólo
 * corre si la conexión apunta a un host local. Para forzarlo en otro entorno
 * hay que pasar SEED_FORCE=1 de forma explícita.
 */
function assertBaseSegura() {
  const url = process.env.DATABASE_URL ?? '';

  if (process.env.SEED_FORCE === '1') {
    console.warn('⚠️  SEED_FORCE=1: se omite la protección de entorno.\n');
    return;
  }

  const esLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal|postgres|db)[:/]/.test(url);
  if (!esLocal) {
    const destino = url.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@') || '(DATABASE_URL vacío)';
    console.error('\n🛑 SEEDER ABORTADO — la base no parece local.');
    console.error(`   Destino: ${destino}`);
    console.error('   Este seeder borra TODOS los datos. Si de verdad quieres');
    console.error('   ejecutarlo aquí, vuelve a correrlo con SEED_FORCE=1.\n');
    process.exit(1);
  }
}

async function main() {
  assertBaseSegura();
  console.log('🌱 Iniciando seeder (Limpieza Total)...\n');

  // ─── LIMPIEZA EN CASCADA ─────────────────────────────────────────────────
  console.log('🧹 Limpiando base de datos...');
  await prisma.auditLog.deleteMany();
  await prisma.sessionEdicion.deleteMany();
  await prisma.garantiaContrato.deleteMany();
  await prisma.contratoFormalizado.deleteMany();
  await prisma.adjudicacion.deleteMany();
  // Sobre2 y Sobre1 se eliminan en cascada con EvaluacionResultados
  await prisma.evaluacionResultados.deleteMany();
  await prisma.ofertaPresentada.deleteMany();
  await prisma.adquirentePliego.deleteMany();
  await prisma.partidaPresupuestaria.deleteMany();
  await prisma.presupuestoItem.deleteMany();
  await prisma.cronogramaExpediente.deleteMany();
  await prisma.informeRecomendacion.deleteMany();
  // Fase1Especificacion se elimina en cascada con FasePreparatoria
  await prisma.fasePreparatoria.deleteMany();
  await prisma.cuentaBancariaEnte.deleteMany();
  await prisma.documentoEjemplo.deleteMany();
  await prisma.normativaGlobal.deleteMany();
  await prisma.normativaEnte.deleteMany();
  await prisma.clausulaGenerica.deleteMany();
  await prisma.clausulaBibliotecaEnte.deleteMany();
  await prisma.documentoProveedor.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.expedienteContratacion.deleteMany();
  await prisma.unidadContratante.deleteMany();
  await prisma.unidadUsuaria.deleteMany();
  await prisma.miembroComision.deleteMany();
  await prisma.comisionContrataciones.deleteMany();
  await prisma.maximaAutoridad.deleteMany();
  await prisma.pliegoGenerado.deleteMany();
  await prisma.manualGenerado.deleteMany();
  await prisma.documentoGenerado.deleteMany();
  try {
    await (prisma as any).mensajeTicket.deleteMany();
  } catch {
    /* ignore */
  }
  try {
    await (prisma as any).ticketSoporte.deleteMany();
  } catch {
    /* ignore */
  }
  try {
    await (prisma as any).diaNoLaborableEnte.deleteMany();
  } catch {
    /* ignore */
  }
  try {
    await (prisma as any).alertaCronograma.deleteMany();
  } catch {
    /* ignore */
  }
  await prisma.usuario.deleteMany();
  await prisma.enteSupervisor.deleteMany();
  await prisma.supervisor.deleteMany();
  await prisma.modalidadContratacion.deleteMany();
  await prisma.entePublico.deleteMany();
  await prisma.universitas.deleteMany();

  // ============================================================================
  // 1. UNIVERSITAS (Super Admin)
  // ============================================================================
  console.log('👤 Creando Universitas...');
  const universitas = await prisma.universitas.create({
    data: {
      nombre: 'Administrador del Sistema',
      email: 'admin@universitas.com',
      passwordHash: await bcrypt.hash('admin123', 10),
    },
  });

  await prisma.usuario.create({
    data: {
      enteId: null,
      email: 'admin@universitas.gob.ve',
      passwordHash: await bcrypt.hash('universitas123', 10),
      nombre: 'Administrador',
      apellido: 'Sistema',
      rol: RolUsuario.UNIVERSITAS,
      activo: true,
    },
  });

  // ============================================================================
  // 2. ENTES PÚBLICOS
  // ============================================================================
  console.log('🏛️  Creando Entes Públicos...');

  await prisma.entePublico.create({
    data: {
      universitasId: universitas.id,
      nombre: 'Alcaldía del Municipio Libertador',
      rif: 'G-20001234-5',
      siglas: 'AML',
      logoUrl: LOGO_NEUTRO,
      estado: 'Distrito Capital',
      municipio: 'Libertador',
      parroquia: 'Catedral',
      direccionFiscal: 'Plaza Bolívar, Edificio Municipal',
      ciudad: 'Caracas',
      nombreUnidadAdminFinanciera: 'Dirección de Administración y Finanzas',
      nombreUnidadTecnologia: 'Dirección de TI',
      nombreUnidadContratante: 'Dirección de Compras',
    },
  });

  const enteMiranda = await prisma.entePublico.create({
    data: {
      universitasId: universitas.id,
      nombre: 'Gobernación del Estado Miranda',
      rif: 'G-20009988-7',
      siglas: 'GEM',
      logoUrl: LOGO_NEUTRO,
      estado: 'Miranda',
      municipio: 'Sucre',
      parroquia: 'Leoncio Martínez',
      direccionFiscal: 'Av. Francisco de Miranda, Edif. Gubernamental',
      ciudad: 'Los Teques',
      nombreUnidadAdminFinanciera: 'Secretaría de Finanzas',
      nombreUnidadTecnologia: 'Dirección de Telemática',
      nombreUnidadContratante: 'Oficina Central de Contrataciones',
    },
  });

  // ============================================================================
  // 3. USUARIOS ENTES
  // ============================================================================
  const adminMiranda = await prisma.usuario.create({
    data: {
      enteId: enteMiranda.id,
      email: 'admin@miranda.gob.ve',
      passwordHash: await bcrypt.hash('miranda123', 10),
      nombre: 'Roberto',
      apellido: 'Rojas',
      rol: RolUsuario.ADMIN_ENTE,
      activo: true,
    },
  });

  const ejecutorMiranda = await prisma.usuario.create({
    data: {
      enteId: enteMiranda.id,
      email: 'ejecutor@miranda.gob.ve',
      passwordHash: await bcrypt.hash('miranda123', 10),
      nombre: 'Pedro',
      apellido: 'Pérez',
      rol: RolUsuario.EJECUTOR,
      activo: true,
    },
  });

  // ============================================================================
  // 4. ESTRUCTURA ORGANIZATIVA (MIRANDA)
  // ============================================================================
  console.log('📋 Generando estructura para GEM...');

  const autoridadMiranda = await prisma.maximaAutoridad.create({
    data: {
      enteId: enteMiranda.id,
      nombreCompletoAutoridad: 'Héctor Rodríguez Castro',
      cedulaAutoridad: 'V-15.123.456',
      cargoOficialAutoridad: 'Gobernador del Estado Miranda',
      datosDesignacionAutoridad: 'Proclamado según Acta del CNE N° 2021-11-21',
      leyesAtribucionesSuscribirAutoridad:
        'Constitución del Estado Bolivariano de Miranda, Art. 70',
      esDelegado: false,
      vigente: true,
      createdBy: adminMiranda.id,
    },
  });

  const comisionMiranda = await prisma.comisionContrataciones.create({
    data: {
      enteId: enteMiranda.id,
      denominacionComision: 'Comisión Principal de Contrataciones GEM',
      datosDesignacionComision: 'Resolución G-005-2022 publicada en Gaceta Estadal',
      comisionCertificada: true,
      correoElectronico: 'comision.contratacion@miranda.gob.ve',
      telefono: '0212-3214567',
      createdBy: adminMiranda.id,
    },
  });

  await prisma.miembroComision.createMany({
    data: [
      {
        comisionId: comisionMiranda.id,
        nombreCompletoMiembro: 'Abg. Claudia López',
        cedulaMiembro: 'V-14.222.333',
        tipoMiembro: TipoMiembro.COORDINADOR,
        areaRepresentacion: AreaRepresentacion.AREA_JURIDICA,
      },
      {
        comisionId: comisionMiranda.id,
        nombreCompletoMiembro: 'Ing. Marcos Beltrán',
        cedulaMiembro: 'V-11.444.555',
        tipoMiembro: TipoMiembro.MIEMBRO_PRINCIPAL,
        areaRepresentacion: AreaRepresentacion.AREA_TECNICA,
      },
      {
        comisionId: comisionMiranda.id,
        nombreCompletoMiembro: 'Lcda. Sofía Méndez',
        cedulaMiembro: 'V-18.666.777',
        tipoMiembro: TipoMiembro.MIEMBRO_PRINCIPAL,
        areaRepresentacion: AreaRepresentacion.AREA_ECONOMICA_FINANCIERA,
      },
      {
        comisionId: comisionMiranda.id,
        nombreCompletoMiembro: 'TSU. Carlos Salazar',
        cedulaMiembro: 'V-20.123.456',
        tipoMiembro: TipoMiembro.SECRETARIO,
        areaRepresentacion: AreaRepresentacion.SECRETARIO_A,
      },
    ],
  });

  const unidadContratanteMiranda = await prisma.unidadContratante.create({
    data: {
      enteId: enteMiranda.id,
      nombreUnidadContratante: 'Oficina Central de Compras y Contrataciones',
      nombreResponsableUnidad: 'Lic. María Delgado',
      nombreResponsableUnidadContratante: 'Lic. María Delgado',
      cargoResponsable: 'Directora de Compras',
      cedulaResponsableUnidadContratante: 'V-13.456.789',
      datosDesignacionUnidadContratante: 'Resolución N° 012-2022',
      activa: true,
      createdBy: adminMiranda.id,
    },
  });

  const unidadMiranda = await prisma.unidadUsuaria.create({
    data: {
      enteId: enteMiranda.id,
      nombreUnidadUsuaria: 'Dirección Regional de Salud',
      nombreResponsableUnidadUsuaria: 'Dr. Alejandro Moreno',
      cargoResponsableUnidadUsuaria: 'Director General',
      createdBy: adminMiranda.id,
    },
  });

  // ============================================================================
  // 5. EXPEDIENTE COMPLETO (MIRANDA) — EN_EVALUACION
  // ============================================================================
  console.log('📂 Creando Expediente Maestro...');

  const modalidadMiranda = await prisma.modalidadContratacion.create({
    data: {
      enteId: enteMiranda.id,
      tipoContratacion: TipoContratacion.BIENES,
      montoEstimadoBs: 15000000.0,
      montoEstimadoDolar: 416666.67,
      valorUcauBase: 36.0,
      modalidadSeleccion: ModalidadSeleccion.LICITACION_PUBLICA,
      createdBy: ejecutorMiranda.id,
    },
  });

  const expedienteM = await prisma.expedienteContratacion.create({
    data: {
      enteId: enteMiranda.id,
      comisionId: comisionMiranda.id,
      unidadUsuariaId: unidadMiranda.id,
      unidadContratanteId: unidadContratanteMiranda.id,
      autoridadId: autoridadMiranda.id,
      modalidadId: modalidadMiranda.id,
      descripcionObjeto: 'Adquisición de Insumos Médicos y Quirúrgicos para la Red Hospitalaria',
      codigoNomenclatura: 'LP-GEM-SALUD-002-2024',
      estatusProceso: EstatusProceso.EN_EVALUACION,
      createdBy: ejecutorMiranda.id,
    },
  });

  const faseM = await prisma.fasePreparatoria.create({
    data: {
      expedienteId: expedienteM.id,
      detallesTecnicosCalidad: 'Equipos de computación de alto rendimiento según normas ISO',
      alcanceCantidadesObra: 'Adquisición e instalación de 15 computadoras',
      origenCrsRegistro: true,
      correoComision: 'comision.contratacion@miranda.gob.ve',
      telefonoComision: '0212-3214567',
      fechaActaInicio: new Date('2024-04-10'),

      // ─── Micromódulo: Actividades Previas ────────────────────────────────
      estadoActividadesPrevias: EstadoMicromodulo.COMPLETADO,
      numReferenciaSnc: 'SNC-2024-004521',
      modifRequerimientoSnc: false,
      justificacionNecesidadContratacion:
        'Desabastecimiento crítico de insumos médicos en la red hospitalaria del estado.',
      justificacionVentajas: 'Renovación tecnológica necesaria para operaciones ininterrumpidas',
      condicionPlurianual: false,
      permitePymesCooperativas: true,
      viabilidadContratoMarco: false,
      fecEstudioMercado: new Date('2024-03-20'),
      numCertificacionPresupuestaria: 'CDP-2024-00871',
      plazoEjecucionProcedimiento: 90,
      lugarLogisticaEjecucion:
        'Almacén central de la Secretaría de Salud, Los Teques, Estado Miranda.',
      requiereEspecializado: false,
      requiereMuestras: true,
      detalleProcedimientoMuestras:
        'El oferente debe consignar una muestra por cada renglón junto con el Sobre N°2.',
      activaPromocionEconomica: true,
      requiereVan: true,
      puntajeVan: 5,
      indPrefLocal: true,
      puntuacionBonoLocal: 3.0,
      indBonoSujeto: false,

      // ─── Micromódulo: Llamado ────────────────────────────────────────────
      estadoLlamado: EstadoMicromodulo.COMPLETADO,
      objetivosEspecificos1: 'Garantizar el abastecimiento continuo de insumos médicos.',
      objetivosEspecificos2: 'Obtener las condiciones económicas más ventajosas para el Ente.',
      objetivosEspecificos3: 'Asegurar la calidad certificada de los insumos adquiridos.',
      direccionRetiroPliego:
        'Av. Francisco de Miranda, Edif. Gubernamental, Piso 3, Oficina de Contrataciones, Los Teques, Estado Miranda',
      horarioRetiroPliego: '08:00am a 12:00m y 01:00pm a 04:00pm',
      pliegoGratuito: false, // equivale a pliegoCosto = true
      costoPliegoBs: 25000.0,
      bancoPagoPliego: 'Banco de Venezuela',
      cuentaPagoPliego: '0102-0000-00-0000000000',
      titularPagoPliego: 'Gobernación del Estado Miranda',
      rifPagoPliego: 'G-20000123-4',
      horaActoRecepAper: '10:00 AM',

      // ─── Micromódulo: Aspectos Generales del Pliego ──────────────────────
      estadoAspectosGenerales: EstadoMicromodulo.COMPLETADO,
      datosActoAutorizacionInicio: 'Resolución N° 045-2024 de fecha 05-04-2024',
      autoridadAclaratorias: 'Comisión Principal de Contrataciones GEM',
      normativaLegal: JSON.stringify([
        'Decreto con Rango, Valor y Fuerza de Ley de Contrataciones Públicas (Gaceta Oficial N° 6.154)',
        'Reglamento de la Ley de Contrataciones Públicas',
        'Normas de Control Interno SUNAI 2025',
      ]),
      diasValidezOferta: 90,
      diasVigenciaGarantiaExtension: 60,
      monedaDiferente: false,
      idiomaDiferente: false,
      porcentajeResponsabilidadSocial: 3.0,
      unidadRespCumplimientoCrs: 'Secretaría de Desarrollo Social del Estado Miranda',
      modalidadCrs: 'Ejecución de proyectos de desarrollo socio comunitario',
      formaCumplimientoCrs:
        'Dotación de insumos médicos a ambulatorios de comunidades priorizadas por el Ente.',
      porcentajeMantenimientoOferta: 5.0,
      porcentajeFielCumplimiento: 15.0,
      retencionFielCumplimiento: true,
      requiereGarantiaLaboral: false,
      polizaResponsabilidadCivil: true,
      porcentajeResponsabilidadCivil: 20.0,
      montoResponsabilidadCivilBs: 3000000.0,
      anticipoContrato: true,
      porcentajeAnticipo: 30.0,
      anticipoEspecial: false,

      // ─── Micromódulo: Modelo de Contrato ─────────────────────────────────
      estadoModeloContrato: EstadoMicromodulo.COMPLETADO,
      modeloContratoData: {
        clauses: [
          {
            instanceId: 'c1',
            order: 1,
            titulo: 'Objeto del contrato',
            cuerpoHtml:
              '<p>El presente contrato tiene por objeto {desc_objeto_contratacion_au_au}.</p>',
            kind: 'preceptiva',
            origen: 'generica',
            basamentoLegal: 'Art. 120 LCP',
          },
          {
            instanceId: 'c2',
            order: 2,
            titulo: 'Plazo de ejecución',
            cuerpoHtml: '<p>El plazo de ejecución será de 90 días continuos.</p>',
            kind: 'preceptiva',
            origen: 'generica',
          },
          {
            instanceId: 'c3',
            order: 3,
            titulo: 'Anticipo',
            cuerpoHtml: '<p>El Ente otorgará un anticipo del 30% del monto del contrato.</p>',
            kind: 'facultativa',
            origen: 'custom',
          },
        ],
      },

      // ─── Micromódulo: Calificación Legal ─────────────────────────────────
      estadoCalificacionLegal: EstadoMicromodulo.COMPLETADO,
      calificacionLegalData: {
        exigidos: {
          modCartaManifestacionVoluntadAuAu: true,
          modCartaAutorizacionAuAu: true,
          modDocConstitutivoAuAu: true,
          modCopiaRifVigenteAuAu: true,
          modCertificadoRncAuAu: true,
          modSolvenciaLaboralAuAu: true,
          modDeclaracionSociosNoInhabilitadosAuAu: true,
          modDeclaracionNoDeudasEnteAuAu: true,
          modDeclaracionNoImpedimentosLcpAuAu: true,
          modDeclaracionConocimientoLugarAuAu: false,
          modDeclaracionInfoFinancieraAuAu: true,
          modEvaluacionDesempenoAuAu: false,
          modCartaOfertaAuAu: true,
          modDeclaracionCapacidadFinancieraAuAu: true,
          modDeclaracionCompromisoRespSocialAuAu: true,
          modGarantiaMantenimientoOfertaAuAu: true,
          modDeclaracionAutocalculoVanAuAu: true,
          modCartaNotificacionesAuAu: true,
          modGarantiaFielCumplAuAu: true,
          modFianzaLaboralAuAu: false,
        },
        sustitutos: {
          sustitutoDjRifVigenteAuAu: true,
          sustitutoDjCertificadoRncAuAu: false,
        },
        personalizados: [
          {
            id: 'p1',
            sobre: 1,
            descripcion: 'Certificado de inscripción en el registro estadal de proveedores',
            exigido: true,
            tieneModelo: false,
          },
        ],
      },

      // ─── Micromódulo: Calificación Financiera ────────────────────────────
      estadoCalificacionFinanciera: EstadoMicromodulo.COMPLETADO,
      calificacionFinancieraData: {
        criterioCalifFinanDescapital: true,
        puntajeMaximoDescapital: 20,
        criterioCalifFinanSolvencia: true,
        rangosSolvencia: {
          rangoMaximo: 2.0,
          puntajeMaximo: 20,
          rangoMedioDesde: 1.2,
          rangoMedioHasta: 1.9,
          puntajeMedio: 12,
          rangoMinimo: 1.0,
          puntajeMinimo: 5,
        },
        criterioCalifFinanRotacion: false,
        criterioCalifFinanRendimiento: false,
        criterioCalifFinanRentabilidad: false,
        criterioCalifFinanEndeudamiento: true,
        rangosEndeudamiento: {
          rangoMaximo: 0.3,
          puntajeMaximo: 20,
          rangoMedioDesde: 0.4,
          rangoMedioHasta: 0.6,
          puntajeMedio: 12,
          rangoMinimo: 0.8,
          puntajeMinimo: 5,
        },
        puntuacionMinimaCalifFinanciera: 60,
      },

      // ─── Micromódulo: Calificación Técnica (suma exacta = 100) ───────────
      estadoCalificacionTecnica: EstadoMicromodulo.COMPLETADO,
      calificacionTecnicaData: {
        criterios: [
          {
            id: 'ct1',
            nombre: 'Experiencia en suministro de insumos médicos',
            puntuacion: 60,
            descripcion: 'Años de experiencia comprobable en contratos de naturaleza equivalente.',
            rangos: [
              { descripcion: 'Igual o mayor a 10 años', puntaje: 60 },
              { descripcion: 'Entre 5 y 9 años', puntaje: 35 },
              { descripcion: 'Menos de 5 años', puntaje: 10 },
            ],
          },
          {
            id: 'ct2',
            nombre: 'Capacidad de almacenamiento y cadena de frío',
            puntuacion: 40,
            descripcion: 'Infraestructura propia certificada para resguardo de insumos.',
            rangos: [
              { descripcion: 'Almacén propio certificado', puntaje: 40 },
              { descripcion: 'Almacén arrendado certificado', puntaje: 20 },
            ],
          },
        ],
        puntuacionMinimaCalifTecnica: 70,
      },

      // ─── Micromódulo: Evaluación T/E (bolsa compartida = 100) ────────────
      estadoEvaluacionTecnicaEconomica: EstadoMicromodulo.COMPLETADO,
      evaluacionTecnicaEconomicaData: {
        tecnica: {
          criterios: [
            {
              id: 'et1',
              nombre: 'Tiempo de entrega',
              puntuacion: 30,
              descripcion: 'Menor plazo ofertado respecto al plazo referencial.',
              rangos: [
                { descripcion: 'Hasta 30 días', puntaje: 30 },
                { descripcion: 'Entre 31 y 60 días', puntaje: 15 },
              ],
            },
            {
              id: 'et2',
              nombre: 'Garantía técnica extendida',
              puntuacion: 10,
              descripcion: 'Meses de garantía por encima del mínimo exigido.',
              rangos: [
                { descripcion: '24 meses o más', puntaje: 10 },
                { descripcion: 'Entre 12 y 23 meses', puntaje: 5 },
              ],
            },
          ],
          puntuacionMinima: 25,
        },
        economica: {
          criterios: [
            {
              id: 'ee1',
              nombre: 'Precio ofertado',
              puntuacion: 60,
              descripcion: 'Menor precio respecto al presupuesto base.',
              rangos: [
                { descripcion: 'Menor o igual al 90% del presupuesto base', puntaje: 60 },
                { descripcion: 'Entre 91% y 100% del presupuesto base', puntaje: 30 },
              ],
            },
          ],
          puntuacionMinima: 30,
        },
      },

      createdBy: ejecutorMiranda.id,
      updatedBy: ejecutorMiranda.id,
    },
  });

  // Archivo de especificaciones técnicas (micromódulo especial de la Fase 1)
  await prisma.fase1Especificacion.create({
    data: {
      fasePreparatoriaId: faseM.id,
      fileName: 'especificaciones-tecnicas-insumos-medicos.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 348_512,
      storageKey: `expedientes/${expedienteM.id}/especificaciones/especificaciones-tecnicas`,
      url: 'https://res.cloudinary.com/da86ka5ip/raw/upload/v1743519586/universitas/especificaciones-demo.pdf',
      uploadedBy: ejecutorMiranda.id,
    },
  });

  await prisma.cronogramaExpediente.create({
    data: {
      expedienteId: expedienteM.id,
      fechaLlamadoParticipar: new Date('2024-05-01'),
      fechaInicioDisponibilidadPliego: new Date('2024-05-05'),
      fechaFinDisponibilidadPliego: new Date('2024-05-15'),
      fechaSolicitudAclaratorias: new Date('2024-05-18'),
      fechaModificacionPliego: new Date('2024-05-20'),
      fechaRespuestaAclaratorias: new Date('2024-05-22'),
      fechaActoRecepcionAperturaSobres: new Date('2024-05-25'),
      fechaLimiteEvaluacion: new Date('2024-06-05'),
      fechaLimiteAdjudicacion: new Date('2024-06-15'),
      fechaLimiteNotificacion: new Date('2024-06-18'),
      fechaLimiteGarantias: new Date('2024-06-25'),
      fechaLimiteFirmaContrato: new Date('2024-06-30'),
      createdBy: ejecutorMiranda.id,
    },
  });

  await prisma.presupuestoItem.createMany({
    data: [
      {
        expedienteId: expedienteM.id,
        descripcionItem: 'Gasa Quirúrgica Estéril 10x10cm (Caja 100 und)',
        codigoPartida: '401-01-002',
        unidadMedida: 'Caja',
        cantidadRequerida: 5000,
        precioUnitarioEstimado: 2500.0,
        totalItem: 12500000.0,
      },
      {
        expedienteId: expedienteM.id,
        descripcionItem: 'Alcohol Isopropílico 70% (Frasco 1L)',
        codigoPartida: '401-02-005',
        unidadMedida: 'Litro',
        cantidadRequerida: 1000,
        precioUnitarioEstimado: 1200.0,
        totalItem: 1200000.0,
      },
    ],
  });

  // El total del presupuesto se mantiene sincronizado con la suma de los ítems.
  await prisma.expedienteContratacion.update({
    where: { id: expedienteM.id },
    data: { totalPresupuesto: 13700000.0 },
  });

  // ============================================================================
  // 5b. CUENTAS BANCARIAS DEL ENTE
  //     Alimentan la selección de cuenta de pago del pliego en el Llamado.
  // ============================================================================
  console.log('🏦 Creando Cuentas Bancarias del Ente...');

  await prisma.cuentaBancariaEnte.createMany({
    data: [
      {
        enteId: enteMiranda.id,
        bancoPago: 'Banco de Venezuela',
        numeroCuenta: '01020000000000000000',
        tipoCuenta: 'Corriente',
        titularPago: 'Gobernación del Estado Miranda',
        rifPago: 'G-20000123-4',
        createdBy: adminMiranda.id,
      },
      {
        enteId: enteMiranda.id,
        bancoPago: 'Banco del Tesoro',
        numeroCuenta: '01630000000000000000',
        tipoCuenta: 'Corriente',
        titularPago: 'Gobernación del Estado Miranda',
        rifPago: 'G-20000123-4',
        createdBy: adminMiranda.id,
      },
    ],
  });

  // ============================================================================
  // 5c. EXPEDIENTE EN FASE 1 RECIÉN INICIADA
  //     Sirve para probar el flujo completo del panel de micromódulos: al abrirlo
  //     sólo Actividades Previas está disponible y el resto queda bloqueado.
  // ============================================================================
  console.log('📂 Creando Expediente en Fase 1 (arranque limpio)...');

  const modalidadFase1 = await prisma.modalidadContratacion.create({
    data: {
      enteId: enteMiranda.id,
      tipoContratacion: TipoContratacion.OBRAS,
      montoEstimadoBs: 48000000.0,
      montoEstimadoDolar: 1333333.33,
      valorUcauBase: 36.0,
      modalidadSeleccion: ModalidadSeleccion.LICITACION_PUBLICA,
      createdBy: ejecutorMiranda.id,
    },
  });

  const expedienteFase1 = await prisma.expedienteContratacion.create({
    data: {
      enteId: enteMiranda.id,
      modalidadId: modalidadFase1.id,
      descripcionObjeto:
        'Rehabilitación de la vialidad agrícola del Municipio Acevedo, Estado Miranda',
      codigoNomenclatura: 'LP-GEM-OBRAS-007-2024',
      estatusProceso: EstatusProceso.EN_PREPARACION,
      modalidadConcursoAbierto: 'Acto Único Apertura Única',
      createdBy: ejecutorMiranda.id,
    },
  });

  // Fase creada pero sin datos: todos los micromódulos quedan en PENDIENTE por
  // defecto, que es justo el estado de entrada del panel.
  await prisma.fasePreparatoria.create({
    data: {
      expedienteId: expedienteFase1.id,
      createdBy: ejecutorMiranda.id,
      updatedBy: ejecutorMiranda.id,
    },
  });

  // ============================================================================
  // 5d. BIBLIOTECA — NORMATIVA (global de UNIVERSITAS + propia del ente)
  // ============================================================================
  console.log('📚 Creando Biblioteca de Normativa...');

  await prisma.normativaGlobal.createMany({
    data: [
      {
        adminUniversitasId: universitas.id,
        textoNormativaCompleto:
          'Artículo 55. Podrá procederse por Concurso Abierto cuando el contrato a ser otorgado sea por un monto estimado superior a veinte mil unidades de cuenta dinámica para el cálculo aritmético del umbral máximo y mínimo (20.000 U.C.A.U.).',
        indActivo: true,
      },
      {
        adminUniversitasId: universitas.id,
        textoNormativaCompleto:
          'Artículo 101. Se podrá proceder excepcionalmente por Contratación Directa, con independencia del monto de la contratación, en los supuestos taxativamente enumerados en el presente artículo, previo acto motivado de la máxima autoridad del órgano o ente contratante.',
        indActivo: true,
      },
      {
        adminUniversitasId: universitas.id,
        textoNormativaCompleto:
          'Artículo 113. El órgano o ente contratante declarará desierto el procedimiento de selección de contratistas cuando no se presenten ofertas, cuando ninguna de las ofertas presentadas resulte calificada, o cuando las ofertas presentadas no cumplan con las condiciones establecidas en el pliego de condiciones.',
        indActivo: true,
      },
      {
        adminUniversitasId: universitas.id,
        textoNormativaCompleto:
          'Artículo 68 del Reglamento. Los criterios de calificación técnica y la puntuación mínima aprobatoria deberán establecerse en el pliego de condiciones, garantizando su objetividad y su relación directa con el objeto de la contratación.',
        indActivo: true,
      },
      {
        adminUniversitasId: universitas.id,
        textoNormativaCompleto:
          'Norma 24, literal b, de las Normas de Control Interno SUNAI 2025. En las especificaciones técnicas deberán incorporarse las condiciones de soporte y garantías de idoneidad necesarias para proteger el patrimonio del Ente.',
        indActivo: true,
      },
    ],
  });

  await prisma.normativaEnte.createMany({
    data: [
      {
        enteId: enteMiranda.id,
        textoNormativaCompleto:
          'Resolución N° 012-2024 de la Gobernación del Estado Miranda. Establece los lineamientos internos aplicables a los procedimientos de contratación adelantados por las dependencias del ejecutivo estadal.',
        createdBy: adminMiranda.id,
      },
      {
        enteId: enteMiranda.id,
        textoNormativaCompleto:
          'Instructivo interno GEM-CI-2024. Define el circuito de aprobación presupuestaria previo a la emisión de la certificación de disponibilidad para procedimientos de contratación.',
        createdBy: adminMiranda.id,
      },
    ],
  });

  // ============================================================================
  // 5e. BIBLIOTECA — CLÁUSULAS (genéricas de UNIVERSITAS + propias del ente)
  // ============================================================================
  console.log('📜 Creando Biblioteca de Cláusulas...');

  await prisma.clausulaGenerica.createMany({
    data: [
      {
        adminUniversitasId: universitas.id,
        tituloClausulaGenerica: 'Objeto del contrato',
        cuerpoClausulaGenerica:
          '<p>El presente contrato tiene por objeto {desc_objeto_contratacion_au_au}, conforme al pliego de condiciones del procedimiento {cod_nomenclatura_proceso_au_au}.</p>',
      },
      {
        adminUniversitasId: universitas.id,
        tituloClausulaGenerica: 'Monto del contrato',
        cuerpoClausulaGenerica:
          '<p>El monto total del contrato asciende a {monto_contrato_bs} bolívares, sujeto a las condiciones de pago establecidas en el pliego de condiciones.</p>',
      },
      {
        adminUniversitasId: universitas.id,
        tituloClausulaGenerica: 'Plazo de ejecución',
        cuerpoClausulaGenerica:
          '<p>El plazo de ejecución será de {plazo_ejecucion_procedimiento_au_au} días continuos, contados a partir de la fecha del acta de inicio.</p>',
      },
      {
        adminUniversitasId: universitas.id,
        tituloClausulaGenerica: 'Garantía de fiel cumplimiento',
        cuerpoClausulaGenerica:
          '<p>El contratista constituirá una garantía de fiel cumplimiento equivalente al {porcentaje_fiel_cumplimiento_au_au}% del monto del contrato, vigente hasta la recepción definitiva.</p>',
      },
      {
        adminUniversitasId: universitas.id,
        tituloClausulaGenerica: 'Anticipo',
        cuerpoClausulaGenerica:
          '<p>El Ente otorgará un anticipo equivalente al {porcentaje_anticipo_au_au}% del monto del contrato, previa constitución de la garantía correspondiente.</p>',
      },
      {
        adminUniversitasId: universitas.id,
        tituloClausulaGenerica: 'Compromiso de Responsabilidad Social',
        cuerpoClausulaGenerica:
          '<p>El contratista se obliga a cumplir el Compromiso de Responsabilidad Social equivalente al {porcentaje_responsabilidad_social_au_au}% del monto del contrato, bajo la modalidad {modalidad_crs_au_au}.</p>',
      },
      {
        adminUniversitasId: universitas.id,
        tituloClausulaGenerica: 'Resolución de controversias',
        cuerpoClausulaGenerica:
          '<p>Las controversias derivadas del presente contrato se resolverán por la vía administrativa; agotada esta, serán competentes los tribunales de la República Bolivariana de Venezuela.</p>',
      },
    ],
  });

  await prisma.clausulaBibliotecaEnte.createMany({
    data: [
      {
        enteId: enteMiranda.id,
        tituloClausulaBib: 'Cadena de frío para insumos médicos',
        cuerpoClausulaBib:
          '<p>El contratista garantizará la cadena de frío durante todo el traslado y almacenamiento de los insumos, y consignará el registro de temperatura en cada entrega.</p>',
        createdBy: adminMiranda.id,
      },
      {
        enteId: enteMiranda.id,
        tituloClausulaBib: 'Penalidades por retraso',
        cuerpoClausulaBib:
          '<p>Se aplicará una multa diaria equivalente al cero coma cinco por ciento (0,5%) del monto del contrato por cada día de retraso imputable al contratista.</p>',
        createdBy: adminMiranda.id,
      },
    ],
  });

  // ============================================================================
  // 5f. DOCUMENTOS DE EJEMPLO
  //     Guías visuales que carga UNIVERSITAS; los entes las consultan por código.
  // ============================================================================
  console.log('🖼️  Creando Documentos de Ejemplo...');

  await prisma.documentoEjemplo.createMany({
    data: [
      {
        codigo: 'documento-01',
        nombre: 'Modelo de acta de inicio',
        descripcion: 'Así debe verse el acta de inicio una vez firmada por la comisión.',
        fileName: 'acta-inicio-ejemplo.png',
        mimeType: 'image/png',
        sizeBytes: 184_320,
        storageKey: 'universitas/documentos-ejemplo/documento-01',
        url: `${LOGO_NEUTRO}`,
        orden: 1,
      },
      {
        codigo: 'documento-02',
        nombre: 'Modelo de pliego de condiciones',
        descripcion: 'Estructura esperada del pliego, con sus secciones numeradas.',
        fileName: 'pliego-ejemplo.png',
        mimeType: 'image/png',
        sizeBytes: 221_184,
        storageKey: 'universitas/documentos-ejemplo/documento-02',
        url: `${LOGO_NEUTRO}`,
        orden: 2,
      },
      {
        codigo: 'documento-03',
        nombre: 'Modelo de llamado a participar',
        descripcion: 'Ejemplo del llamado publicado, con los datos de retiro del pliego.',
        fileName: 'llamado-ejemplo.png',
        mimeType: 'image/png',
        sizeBytes: 156_672,
        storageKey: 'universitas/documentos-ejemplo/documento-03',
        url: `${LOGO_NEUTRO}`,
        orden: 3,
      },
    ],
  });

  // ============================================================================
  // 6. PROVEEDORES
  // ============================================================================
  console.log('🏢 Creando Proveedores...');

  const proveedorAlpha = await prisma.proveedor.create({
    data: {
      enteId: enteMiranda.id,
      nombre: 'Alpha Medical Supplies C.A.',
      rif: 'J-40001234-5',
      correo: 'ofertas@alphamedical.com',
      tipoPersona: 'JURIDICA',
      tipoEntidadJuridica: 'COMPANIA_ANONIMA',
      estado: 'Miranda',
      municipio: 'Chacao',
      direccionFiscal: 'Av. Francisco de Miranda, Torre Ejecutiva, Piso 3',
      telefono: '+58 212-9876543',
      nombreRepLegal: 'Lic. Carmen Rodríguez',
      cedulaRepLegal: 'V-12.345.678',
      registroRnc: true,
      solvenciaLaboral: true,
      licenciaFuncionamientoMunicipal: true,
      areaEspecialidad: 'BIENES',
      anosExperiencia: 12,
      patrimonioReportado: 850000.0,
      nivelContratacion: 'ALTA',
      estatusValidacion: 'APROBADO',
      datosRegistroMercantil:
        'Registro Mercantil Primero de la Circunscripción Judicial del Estado Miranda, bajo el N° 45, Tomo 18-A del Año 2010',
      createdBy: ejecutorMiranda.id,
    },
  });

  const proveedorBeta = await prisma.proveedor.create({
    data: {
      enteId: enteMiranda.id,
      nombre: 'Beta Distribuciones Médicas S.R.L.',
      rif: 'J-30005678-9',
      correo: 'ventas@betadistrib.com',
      tipoPersona: 'JURIDICA',
      tipoEntidadJuridica: 'SRL',
      estado: 'Distrito Capital',
      municipio: 'Libertador',
      direccionFiscal: 'Sabana Grande, C.C. Líder, Local 12',
      telefono: '+58 212-7654321',
      nombreRepLegal: 'Ing. Marco Villanueva',
      cedulaRepLegal: 'V-8.765.432',
      registroRnc: true,
      solvenciaLaboral: true,
      licenciaFuncionamientoMunicipal: true,
      areaEspecialidad: 'BIENES',
      anosExperiencia: 7,
      patrimonioReportado: 320000.0,
      nivelContratacion: 'MEDIA',
      estatusValidacion: 'APROBADO',
      datosRegistroMercantil:
        'Registro Mercantil Segundo del Distrito Capital, bajo el N° 12, Tomo 05-B del Año 2016',
      createdBy: ejecutorMiranda.id,
    },
  });

  const proveedorGamma = await prisma.proveedor.create({
    data: {
      enteId: enteMiranda.id,
      nombre: 'Gamma Insumos Hospitalarios C.A.',
      rif: 'J-20011111-3',
      correo: 'contacto@gammainsumos.com',
      tipoPersona: 'JURIDICA',
      tipoEntidadJuridica: 'COMPANIA_ANONIMA',
      estado: 'Carabobo',
      municipio: 'Valencia',
      direccionFiscal: 'Zona Industrial Norte, Galpón 7, Valencia',
      telefono: '+58 241-8901234',
      nombreRepLegal: 'Dr. Luis Fernández',
      cedulaRepLegal: 'V-15.987.654',
      registroRnc: true,
      solvenciaLaboral: true,
      licenciaFuncionamientoMunicipal: true,
      areaEspecialidad: 'BIENES',
      anosExperiencia: 20,
      patrimonioReportado: 1500000.0,
      nivelContratacion: 'ALTA',
      estatusValidacion: 'APROBADO',
      datosRegistroMercantil:
        'Registro Mercantil Primero de la Circunscripción Judicial del Estado Carabobo, bajo el N° 8, Tomo 22-A del Año 2003',
      createdBy: ejecutorMiranda.id,
    },
  });

  // ============================================================================
  // 7. OFERTAS PRESENTADAS (Fase 2 — tb_oferta_presentada)
  // ============================================================================
  console.log('📑 Registrando Ofertas Presentadas...');

  const ofertaAlpha = await prisma.ofertaPresentada.create({
    data: {
      expedienteId: expedienteM.id,
      proveedorId: proveedorAlpha.id,
      rifProveedorOferente: 'J-40001234-5',
      nombreProveedorOferente: 'Alpha Medical Supplies C.A.',
      nombreRepLegalOferente: 'Lic. Carmen Rodríguez',
      cedulaRepLegalOferente: 'V-12.345.678',
      correoProveedorOferente: 'ofertas@alphamedical.com',
      datosRegistroMercantilProveedorOferente:
        'Registro Mercantil Primero de la Circunscripción Judicial del Estado Miranda, bajo el N° 45, Tomo 18-A del Año 2010',
      numeroSobresEntregados: 2,
      montoOfertaBs: 13200000.0,
      createdBy: ejecutorMiranda.id,
    },
  });

  const ofertaBeta = await prisma.ofertaPresentada.create({
    data: {
      expedienteId: expedienteM.id,
      proveedorId: proveedorBeta.id,
      rifProveedorOferente: 'J-30005678-9',
      nombreProveedorOferente: 'Beta Distribuciones Médicas S.R.L.',
      nombreRepLegalOferente: 'Ing. Marco Villanueva',
      cedulaRepLegalOferente: 'V-8.765.432',
      correoProveedorOferente: 'ventas@betadistrib.com',
      datosRegistroMercantilProveedorOferente:
        'Registro Mercantil Segundo del Distrito Capital, bajo el N° 12, Tomo 05-B del Año 2016',
      numeroSobresEntregados: 2,
      montoOfertaBs: 14750000.0,
      createdBy: ejecutorMiranda.id,
    },
  });

  const ofertaGamma = await prisma.ofertaPresentada.create({
    data: {
      expedienteId: expedienteM.id,
      proveedorId: proveedorGamma.id,
      rifProveedorOferente: 'J-20011111-3',
      nombreProveedorOferente: 'Gamma Insumos Hospitalarios C.A.',
      nombreRepLegalOferente: 'Dr. Luis Fernández',
      cedulaRepLegalOferente: 'V-15.987.654',
      correoProveedorOferente: 'contacto@gammainsumos.com',
      datosRegistroMercantilProveedorOferente:
        'Registro Mercantil Primero de la Circunscripción Judicial del Estado Carabobo, bajo el N° 8, Tomo 22-A del Año 2003',
      numeroSobresEntregados: 2,
      montoOfertaBs: 12800000.0,
      createdBy: ejecutorMiranda.id,
    },
  });

  // ============================================================================
  // 8. EVALUACIONES FASE 3 (tb_evaluacion_resultados + tb_sobre_1 + tb_sobre_2)
  // ============================================================================
  console.log('📊 Creando Evaluaciones Fase 3...');

  // ─── EVALUACIÓN ALPHA (Calificada — Primera Opción) ──────────────────────
  const evalAlpha = await prisma.evaluacionResultados.create({
    data: {
      ofertaId: ofertaAlpha.id,
      nombreProveedorEvaluado: 'Alpha Medical Supplies C.A.',
      rifProveedorEvaluado: 'J-40001234-5',
      nombreRepLegalEvaluado: 'Lic. Carmen Rodríguez',
      cedulaRepLegalEvaluado: 'V-12.345.678',
      // Calificación legal
      oferenteCalificadoLegal: true,
      justificacionCalificadoLegal:
        'Cumplió con todos los recaudos legales exigidos en el Pliego de Condiciones.',
      // Calificación financiera
      indiceLiquidez: 2.35,
      indiceSolvencia: 0.42,
      oferenteCalificadoFinanciera: true,
      justificacionCalificadaFinanciera:
        'Índice de liquidez superior a 1 e índice de solvencia por debajo de 0.5, dentro de los parámetros exigidos.',
      // Calificación técnica
      actividadComercial: 15,
      relacionSuministros: 14,
      referenciasComercialesPuntaje: 10,
      totalCalifTecnica: 39,
      oferenteCalificadoTecnica: true,
      justificacionCalificadoTecnica:
        'Empresa con amplia trayectoria en el suministro de insumos médicos a entes públicos.',
      // Calificación global
      oferenteCalificado: true,
      // Evaluación técnica (Matriz)
      oferenteEvaluadoTecnico: true,
      justificacionEvaluadoTecnico:
        'Cumplió con todos los criterios de evaluación técnica del Pliego.',
      // Totales
      totalTecnica: 39,
      totalEconomica: 50,
      totalVan: 10,
      totalEvaluacion: 99,
      posicionPrelacion: 'Primera Opción',
      createdBy: ejecutorMiranda.id,
    },
  });

  await prisma.sobre1.create({
    data: {
      evaluacionId: evalAlpha.id,
      cartaManifestacionVoluntad: true,
      cartaAutorizacion: true,
      docConstitutivo: true,
      copiaRifVigente: true,
      certificadoRnc: true,
      solvenciaLaboral: true,
      declaracionSociosNoInhabilitados: true,
      declaracionNoDeudas: true,
      declaracionNoImpedimentosLcp: true,
      declaracionInfoFinanciera: true,
      relacionServiciosPrestados: true,
      evaluacionDesempenio: true,
      referenciasComerciales: true,
      createdBy: ejecutorMiranda.id,
    },
  });

  await prisma.sobre2.create({
    data: {
      evaluacionId: evalAlpha.id,
      ofertaTecnicoEconomica: true,
      cartaOferta: true,
      declaracionCapacidadFinanciera: true,
      declaracionCompromisoRespSocial: true,
      garantiaMantenimientoOferta: true,
      declaracionAutocalculoVan: true,
      cartaNotificaciones: true,
      garantiaFielCumpl: true,
      cartaCompromiso: true,
      fianzaLaboral: false,
      obsFianzaLaboral: 'No aplica para esta contratación.',
      experienciaPersonalTecnico: false,
      obsExperienciaPersonalTecnico: 'No aplica para bienes.',
      criterio1Evaluacion: 'Tiempo de entrega a partir de la recepción de la Orden de compra',
      puntuacionCriterio1: 14,
      criterio2Evaluacion: 'Garantía, Canje o Sustitución de los Bienes / insumos',
      puntuacionCriterio2: 14,
      criterio3Evaluacion: 'Especificaciones Técnicas de los Bienes / insumos',
      puntuacionCriterio3: 8,
      criterio4Evaluacion: 'Disponibilidad de los Bienes / insumos requeridos',
      puntuacionCriterio4: 14,
      montoOfertaBs: 13200000.0,
      porcentajeVan: 75,
      createdBy: ejecutorMiranda.id,
    },
  });

  // ─── EVALUACIÓN GAMMA (Calificada — Segunda Opción) ──────────────────────
  const evalGamma = await prisma.evaluacionResultados.create({
    data: {
      ofertaId: ofertaGamma.id,
      nombreProveedorEvaluado: 'Gamma Insumos Hospitalarios C.A.',
      rifProveedorEvaluado: 'J-20011111-3',
      nombreRepLegalEvaluado: 'Dr. Luis Fernández',
      cedulaRepLegalEvaluado: 'V-15.987.654',
      oferenteCalificadoLegal: true,
      justificacionCalificadoLegal: 'Presentó todos los recaudos legales completos y vigentes.',
      indiceLiquidez: 3.1,
      indiceSolvencia: 0.32,
      oferenteCalificadoFinanciera: true,
      justificacionCalificadaFinanciera:
        'Sólida posición financiera con índices dentro de parámetros.',
      actividadComercial: 15,
      relacionSuministros: 15,
      referenciasComercialesPuntaje: 10,
      totalCalifTecnica: 40,
      oferenteCalificadoTecnica: true,
      justificacionCalificadoTecnica:
        'Vasta experiencia en el rubro con más de 20 años en el mercado.',
      oferenteCalificado: true,
      oferenteEvaluadoTecnico: true,
      justificacionEvaluadoTecnico: 'Supera los criterios mínimos de evaluación técnica.',
      totalTecnica: 40,
      totalEconomica: 40,
      totalVan: 10,
      totalEvaluacion: 90,
      posicionPrelacion: 'Segunda Opción',
      createdBy: ejecutorMiranda.id,
    },
  });

  await prisma.sobre1.create({
    data: {
      evaluacionId: evalGamma.id,
      cartaManifestacionVoluntad: true,
      cartaAutorizacion: true,
      docConstitutivo: true,
      copiaRifVigente: true,
      certificadoRnc: true,
      solvenciaLaboral: true,
      declaracionSociosNoInhabilitados: true,
      declaracionNoDeudas: true,
      declaracionNoImpedimentosLcp: true,
      declaracionInfoFinanciera: true,
      relacionServiciosPrestados: true,
      evaluacionDesempenio: true,
      referenciasComerciales: true,
      createdBy: ejecutorMiranda.id,
    },
  });

  await prisma.sobre2.create({
    data: {
      evaluacionId: evalGamma.id,
      ofertaTecnicoEconomica: true,
      cartaOferta: true,
      declaracionCapacidadFinanciera: true,
      declaracionCompromisoRespSocial: true,
      garantiaMantenimientoOferta: true,
      declaracionAutocalculoVan: true,
      cartaNotificaciones: true,
      garantiaFielCumpl: true,
      cartaCompromiso: true,
      fianzaLaboral: false,
      obsFianzaLaboral: 'No aplica.',
      experienciaPersonalTecnico: false,
      criterio1Evaluacion: 'Tiempo de entrega a partir de la recepción de la Orden de compra',
      puntuacionCriterio1: 15,
      criterio2Evaluacion: 'Garantía, Canje o Sustitución de los Bienes / insumos',
      puntuacionCriterio2: 13,
      criterio3Evaluacion: 'Especificaciones Técnicas de los Bienes / insumos',
      puntuacionCriterio3: 8,
      criterio4Evaluacion: 'Disponibilidad de los Bienes / insumos requeridos',
      puntuacionCriterio4: 14,
      montoOfertaBs: 12800000.0,
      porcentajeVan: 68,
      createdBy: ejecutorMiranda.id,
    },
  });

  // ─── EVALUACIÓN BETA (Descalificada) ─────────────────────────────────────
  const evalBeta = await prisma.evaluacionResultados.create({
    data: {
      ofertaId: ofertaBeta.id,
      nombreProveedorEvaluado: 'Beta Distribuciones Médicas S.R.L.',
      rifProveedorEvaluado: 'J-30005678-9',
      nombreRepLegalEvaluado: 'Ing. Marco Villanueva',
      cedulaRepLegalEvaluado: 'V-8.765.432',
      oferenteCalificadoLegal: false,
      justificacionCalificadoLegal:
        'No consignó el Certificado de Inscripción en el RNC vigente ni la Solvencia Laboral.',
      indiceLiquidez: 0.85,
      indiceSolvencia: 0.72,
      oferenteCalificadoFinanciera: false,
      justificacionCalificadaFinanciera:
        'Índice de liquidez inferior a 1, no cumple el requisito mínimo financiero.',
      actividadComercial: 8,
      relacionSuministros: 6,
      referenciasComercialesPuntaje: 5,
      totalCalifTecnica: 19,
      oferenteCalificadoTecnica: false,
      justificacionCalificadoTecnica:
        'Puntaje técnico insuficiente: 19 puntos sobre el mínimo requerido de 25.',
      oferenteCalificado: false,
      motivoDescalificacion:
        'Incumplimiento de recaudos legales obligatorios (RNC y Solvencia Laboral) e índice de liquidez deficitario.',
      itemsDescalificacion:
        'Ítem 5 del Pliego de Condiciones (Certificado RNC); Art. 95 LCP; Modelo N° 3 (Solvencia Laboral).',
      createdBy: ejecutorMiranda.id,
    },
  });

  await prisma.sobre1.create({
    data: {
      evaluacionId: evalBeta.id,
      cartaManifestacionVoluntad: true,
      cartaAutorizacion: true,
      docConstitutivo: true,
      copiaRifVigente: true,
      certificadoRnc: false,
      obsCertificadoRnc: 'No consignó el certificado RNC. Documento ausente del sobre.',
      solvenciaLaboral: false,
      obsSolvenciaLaboral: 'No presentó certificado ni declaración jurada de solvencia laboral.',
      declaracionSociosNoInhabilitados: true,
      declaracionNoDeudas: true,
      declaracionNoImpedimentosLcp: true,
      declaracionInfoFinanciera: true,
      relacionServiciosPrestados: false,
      obsRelacionServiciosPrestados: 'Relación de servicios incompleta, sin soporte documental.',
      evaluacionDesempenio: false,
      obsEvaluacionDesempenio: 'No presentó informe de evaluación de desempeño.',
      referenciasComerciales: true,
      createdBy: ejecutorMiranda.id,
    },
  });

  await prisma.sobre2.create({
    data: {
      evaluacionId: evalBeta.id,
      ofertaTecnicoEconomica: true,
      cartaOferta: true,
      declaracionCapacidadFinanciera: false,
      obsDeclaracionCapacidadFinanciera:
        'No consignó declaración jurada de capacidad financiera (Modelo N° 10).',
      declaracionCompromisoRespSocial: true,
      garantiaMantenimientoOferta: false,
      obsGarantiaMantenimientoOferta: 'Garantía de mantenimiento de oferta no consignada.',
      declaracionAutocalculoVan: false,
      cartaNotificaciones: true,
      garantiaFielCumpl: false,
      cartaCompromiso: false,
      fianzaLaboral: false,
      experienciaPersonalTecnico: false,
      montoOfertaBs: 14750000.0,
      createdBy: ejecutorMiranda.id,
    },
  });

  console.log('\n✅ SEEDER COMPLETADO EXITOSAMENTE');
  console.log('--------------------------------------------------');
  console.log('🔑 CREDENCIALES:');
  console.log('UNIVERSITAS:   admin@universitas.gob.ve / universitas123');
  console.log('MIRANDA ADMIN: admin@miranda.gob.ve    / miranda123');
  console.log('MIRANDA EJEC:  ejecutor@miranda.gob.ve / miranda123');
  console.log('--------------------------------------------------');
  console.log('📦 DATOS CREADOS:');
  console.log(`  Expediente: LP-GEM-SALUD-002-2024 (EN_EVALUACION)`);
  console.log(`    id: ${expedienteM.id}`);
  console.log(`    Fase 1: los 8 micromódulos en COMPLETADO + especificaciones + 2 ítems`);
  console.log(`  Oferta Alpha (ID: ${ofertaAlpha.id}) → Eval: ${evalAlpha.id} ✅ 1ra Opción`);
  console.log(`  Oferta Gamma (ID: ${ofertaGamma.id}) → Eval: ${evalGamma.id} ✅ 2da Opción`);
  console.log(`  Oferta Beta  (ID: ${ofertaBeta.id})  → Eval: ${evalBeta.id}  ❌ Descalificada`);
  console.log('--------------------------------------------------');
  console.log(`  Expediente: LP-GEM-OBRAS-007-2024 (EN_PREPARACION, tipo OBRAS)`);
  console.log(`    id: ${expedienteFase1.id}`);
  console.log(`    Fase 1: todo PENDIENTE — sirve para probar el flujo desde cero`);
  console.log(`  Cuentas bancarias del Ente Miranda: 2`);
  console.log(`  Normativa:  5 globales + 2 del ente`);
  console.log(`  Cláusulas:  7 genéricas + 2 del ente`);
  console.log(`  Documentos de ejemplo: 3 (documento-01 a documento-03)`);
  console.log('--------------------------------------------------');
  console.log('🔎 PARA PROBAR FASE 1:');
  console.log(`  GET /expedientes/${expedienteM.id}/fase-preparatoria/progreso`);
  console.log(`  GET /expedientes/${expedienteFase1.id}/fase-preparatoria/progreso`);
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error en seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
