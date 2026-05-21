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

  // 0. La limpieza de la base de datos ha sido desactivada por seguridad
  console.log('⚠️ Limpieza de base de datos desactivada por seguridad.');

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
  // 5. EXPEDIENTE COMPLETO (MIRANDA)
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
      estatusProceso: EstatusProceso.EN_PREPARACION,
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
      // Nuevos campos para Generación de Documentos
      fechaActaInicio: new Date('2024-04-10'),
      datosActoAutorizacionInicio: 'Resolución N° 045-2024 de fecha 05-04-2024',
      condicionPlurianual: 'No aplica',
      viabilidadContratoMarco: 'No aplica',
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
      {
        expedienteId: expedienteM.id,
        descripcionItem: 'Guantes de Nitrilo (Talla M)',
        codigoPartida: '401-01-010',
        unidadMedida: 'Par',
        cantidadRequerida: 10000,
        precioUnitarioEstimado: 130.0,
        totalItem: 1300000.0,
      },
    ],
  });

  console.log('\n✅ SEEDER REESTRUCTURADO Y COMPLETADO');
  console.log('--------------------------------------------------');
  console.log('🔑 CREDENCIALES:');
  console.log('MIRANDA ADMIN: admin@miranda.gob.ve / miranda123');
  console.log('MIRANDA EJEC:  ejecutor@miranda.gob.ve / miranda123');
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
