import {
  PrismaClient,
  TipoMiembro,
  AreaRepresentacion,
  RolUsuario,
  TipoContratacion,
  ModalidadSeleccion,
  EstatusProceso,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const LOGO_NEUTRO =
  'https://res.cloudinary.com/da86ka5ip/image/upload/v1743519586/universitas/placeholder_logo.png';

async function main() {
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
  await prisma.cronogramaExpediente.deleteMany();
  await prisma.fasePreparatoria.deleteMany();
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
  try { await (prisma as any).mensajeTicket.deleteMany(); } catch { /* ignore */ }
  try { await (prisma as any).ticketSoporte.deleteMany(); } catch { /* ignore */ }
  try { await (prisma as any).diaNoLaborableEnte.deleteMany(); } catch { /* ignore */ }
  try { await (prisma as any).alertaCronograma.deleteMany(); } catch { /* ignore */ }
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
      autoridadId: autoridadMiranda.id,
      modalidadId: modalidadMiranda.id,
      descripcionObjeto: 'Adquisición de Insumos Médicos y Quirúrgicos para la Red Hospitalaria',
      codigoNomenclatura: 'LP-GEM-SALUD-002-2024',
      estatusProceso: EstatusProceso.EN_EVALUACION,
      createdBy: ejecutorMiranda.id,
    },
  });

  await prisma.fasePreparatoria.create({
    data: {
      expedienteId: expedienteM.id,
      detallesTecnicosCalidad:
        'Suministros médicos estériles de alta calidad, certificados por SENIAT y MPPS.',
      alcanceCantidadesObra: 'Lote de 50,000 unidades divididas en 10 rubros críticos.',
      justificacionVentajas: 'Garantizar el inventario para el primer semestre de 2024.',
      origenCrsRegistro: true,
      diasValidezOferta: 90,
      diasVigenciaGarantiaExtension: 60,
      costoPliegoBs: 25000.0,
      bancoPagoPliego: 'Banco de Venezuela',
      cuentaPagoPliego: '0102-0000-00-0000000000',
      titularPagoPliego: 'Gobernación del Estado Miranda',
      horaActoRecepAper: '10:00 AM',
      correoComision: 'comision.contratacion@miranda.gob.ve',
      telefonoComision: '0212-3214567',
      fechaActaInicio: new Date('2024-04-10'),
      datosActoAutorizacionInicio: 'Resolución N° 045-2024 de fecha 05-04-2024',
      condicionPlurianual: false,
      viabilidadContratoMarco: false,
      createdBy: ejecutorMiranda.id,
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
      justificacionCalificadoLegal: 'Cumplió con todos los recaudos legales exigidos en el Pliego de Condiciones.',
      // Calificación financiera
      indiceLiquidez: 2.35,
      indiceSolvencia: 0.42,
      oferenteCalificadoFinanciera: true,
      justificacionCalificadaFinanciera: 'Índice de liquidez superior a 1 e índice de solvencia por debajo de 0.5, dentro de los parámetros exigidos.',
      // Calificación técnica
      actividadComercial: 15,
      relacionSuministros: 14,
      referenciasComercialesPuntaje: 10,
      totalCalifTecnica: 39,
      oferenteCalificadoTecnica: true,
      justificacionCalificadoTecnica: 'Empresa con amplia trayectoria en el suministro de insumos médicos a entes públicos.',
      // Calificación global
      oferenteCalificado: true,
      // Evaluación técnica (Matriz)
      oferenteEvaluadoTecnico: true,
      justificacionEvaluadoTecnico: 'Cumplió con todos los criterios de evaluación técnica del Pliego.',
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
      indiceLiquidez: 3.10,
      indiceSolvencia: 0.32,
      oferenteCalificadoFinanciera: true,
      justificacionCalificadaFinanciera: 'Sólida posición financiera con índices dentro de parámetros.',
      actividadComercial: 15,
      relacionSuministros: 15,
      referenciasComercialesPuntaje: 10,
      totalCalifTecnica: 40,
      oferenteCalificadoTecnica: true,
      justificacionCalificadoTecnica: 'Vasta experiencia en el rubro con más de 20 años en el mercado.',
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
      justificacionCalificadoLegal: 'No consignó el Certificado de Inscripción en el RNC vigente ni la Solvencia Laboral.',
      indiceLiquidez: 0.85,
      indiceSolvencia: 0.72,
      oferenteCalificadoFinanciera: false,
      justificacionCalificadaFinanciera: 'Índice de liquidez inferior a 1, no cumple el requisito mínimo financiero.',
      actividadComercial: 8,
      relacionSuministros: 6,
      referenciasComercialesPuntaje: 5,
      totalCalifTecnica: 19,
      oferenteCalificadoTecnica: false,
      justificacionCalificadoTecnica: 'Puntaje técnico insuficiente: 19 puntos sobre el mínimo requerido de 25.',
      oferenteCalificado: false,
      motivoDescalificacion: 'Incumplimiento de recaudos legales obligatorios (RNC y Solvencia Laboral) e índice de liquidez deficitario.',
      itemsDescalificacion: 'Ítem 5 del Pliego de Condiciones (Certificado RNC); Art. 95 LCP; Modelo N° 3 (Solvencia Laboral).',
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
      obsDeclaracionCapacidadFinanciera: 'No consignó declaración jurada de capacidad financiera (Modelo N° 10).',
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
  console.log(`  Oferta Alpha (ID: ${ofertaAlpha.id}) → Eval: ${evalAlpha.id} ✅ 1ra Opción`);
  console.log(`  Oferta Gamma (ID: ${ofertaGamma.id}) → Eval: ${evalGamma.id} ✅ 2da Opción`);
  console.log(`  Oferta Beta  (ID: ${ofertaBeta.id})  → Eval: ${evalBeta.id}  ❌ Descalificada`);
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
