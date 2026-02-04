"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando seeder...\n');
    console.log('🧹 Limpiando base de datos...');
    await prisma.auditLog.deleteMany();
    await prisma.sessionEdicion.deleteMany();
    await prisma.garantiaContrato.deleteMany();
    await prisma.contratoFormalizado.deleteMany();
    await prisma.adjudicacion.deleteMany();
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
    await prisma.manualGenerado.deleteMany();
    await prisma.documentoGenerado.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.enteSupervisor.deleteMany();
    await prisma.supervisor.deleteMany();
    await prisma.entePublico.deleteMany();
    await prisma.universitas.deleteMany();
    console.log('👤 Creando Universitas...');
    const universitas = await prisma.universitas.create({
        data: {
            nombre: 'Administrador del Sistema',
            email: 'admin@universitas.com',
            passwordHash: await bcrypt.hash('admin123', 10),
        },
    });
    console.log(`✅ Universitas creado: ${universitas.email}\n`);
    console.log('🏛️  Creando Entes Públicos...');
    const enteAlcaldia = await prisma.entePublico.create({
        data: {
            universitasId: universitas.id,
            nombre: 'Alcaldía del Municipio Libertador',
            rif: 'G-20001234-5',
            siglas: 'AML',
            estado: 'Distrito Capital',
            municipio: 'Libertador',
            parroquia: 'Catedral',
            direccionFiscal: 'Plaza Bolívar, Edificio Municipal',
            nombreUnidadAdminFinanciera: 'Dirección de Administración y Finanzas',
            nombreUnidadTecnologia: 'Dirección de Tecnología e Información',
            nombreUnidadContratante: 'Dirección de Compras y Contrataciones',
        },
    });
    const enteMinisterio = await prisma.entePublico.create({
        data: {
            universitasId: universitas.id,
            nombre: 'Ministerio de Educación',
            rif: 'G-20005678-9',
            siglas: 'MINEDU',
            estado: 'Distrito Capital',
            municipio: 'Libertador',
            parroquia: 'El Recreo',
            direccionFiscal: 'Av. Universidad, Torre Ministerial',
            nombreUnidadAdminFinanciera: 'Oficina de Planificación y Presupuesto',
            nombreUnidadTecnologia: 'Centro de Tecnologías de Información',
            nombreUnidadContratante: 'Oficina de Adquisiciones',
        },
    });
    console.log(`✅ ${enteAlcaldia.siglas} - ${enteAlcaldia.nombre}`);
    console.log(`✅ ${enteMinisterio.siglas} - ${enteMinisterio.nombre}\n`);
    console.log('👁️  Creando Supervisores...');
    const supervisor1 = await prisma.supervisor.create({
        data: {
            nombre: 'Contraloría Municipal',
            rif: 'G-30001111-0',
            email: 'contraloria@municipal.gob.ve',
            telefono: '+58 212-5551234',
            direccion: 'Av. Principal de Los Ruices',
        },
    });
    await prisma.enteSupervisor.create({
        data: {
            enteId: enteAlcaldia.id,
            supervisorId: supervisor1.id,
            fechaInicio: new Date('2024-01-01'),
            fechaFin: new Date('2024-12-31'),
            activo: true,
        },
    });
    console.log(`✅ ${supervisor1.nombre} → asignado a ${enteAlcaldia.siglas}\n`);
    console.log('👥 Creando Usuarios...');
    const adminAlcaldia = await prisma.usuario.create({
        data: {
            enteId: enteAlcaldia.id,
            email: 'admin@alcaldia.gob.ve',
            passwordHash: await bcrypt.hash('alcaldia123', 10),
            nombre: 'María',
            apellido: 'González',
            rol: 'ADMIN_ENTE',
            activo: true,
        },
    });
    const ejecutor1 = await prisma.usuario.create({
        data: {
            enteId: enteAlcaldia.id,
            email: 'jperez@alcaldia.gob.ve',
            passwordHash: await bcrypt.hash('ejecutor123', 10),
            nombre: 'Juan',
            apellido: 'Pérez',
            rol: 'EJECUTOR',
            activo: true,
        },
    });
    const ejecutor2 = await prisma.usuario.create({
        data: {
            enteId: enteAlcaldia.id,
            email: 'amartinez@alcaldia.gob.ve',
            passwordHash: await bcrypt.hash('ejecutor123', 10),
            nombre: 'Ana',
            apellido: 'Martínez',
            rol: 'EJECUTOR',
            activo: true,
        },
    });
    const visualizador = await prisma.usuario.create({
        data: {
            enteId: enteAlcaldia.id,
            email: 'lrodriguez@alcaldia.gob.ve',
            passwordHash: await bcrypt.hash('viewer123', 10),
            nombre: 'Luis',
            apellido: 'Rodríguez',
            rol: 'VISUALIZADOR',
            activo: true,
        },
    });
    await prisma.usuario.create({
        data: {
            enteId: enteMinisterio.id,
            email: 'cgarcia@minedu.gob.ve',
            passwordHash: await bcrypt.hash('minedu123', 10),
            nombre: 'Carmen',
            apellido: 'García',
            rol: 'EJECUTOR',
            activo: true,
        },
    });
    console.log(`✅ Admin Ente: ${adminAlcaldia.email}`);
    console.log(`✅ Ejecutor 1: ${ejecutor1.email}`);
    console.log(`✅ Ejecutor 2: ${ejecutor2.email}`);
    console.log(`✅ Visualizador: ${visualizador.email}\n`);
    console.log('📋 Creando estructura organizativa...');
    const autoridad = await prisma.maximaAutoridad.create({
        data: {
            enteId: enteAlcaldia.id,
            nombreCompleto: 'Dr. Carlos Alberto Fernández',
            cedula: 'V-12345678',
            cargoOficial: 'Alcalde del Municipio Libertador',
            datosDesignacion: 'Electo según GACETA Municipal N° 001-2024',
            leyesAtribucionesSuscribir: 'Ley Orgánica del Poder Público Municipal',
            esDelegado: false,
            vigente: true,
            createdBy: adminAlcaldia.id,
        },
    });
    const comision = await prisma.comisionContrataciones.create({
        data: {
            enteId: enteAlcaldia.id,
            denominacion: 'Comisión de Contrataciones Públicas',
            datosDesignacion: 'Resolución N° 100-2024',
            tieneCertificado: true,
            createdBy: adminAlcaldia.id,
        },
    });
    await prisma.miembroComision.createMany({
        data: [
            {
                comisionId: comision.id,
                nombreCompleto: 'Lic. Pedro Ramírez',
                cedula: 'V-11111111',
                tipoMiembro: 'COORDINADOR',
                areaRepresentacion: 'JURIDICA',
            },
            {
                comisionId: comision.id,
                nombreCompleto: 'Ing. Laura Sánchez',
                cedula: 'V-22222222',
                tipoMiembro: 'TITULAR',
                areaRepresentacion: 'TECNICA',
            },
            {
                comisionId: comision.id,
                nombreCompleto: 'Lic. Roberto Castro',
                cedula: 'V-33333333',
                tipoMiembro: 'TITULAR',
                areaRepresentacion: 'FINANCIERA',
            },
        ],
    });
    const unidadUsuaria = await prisma.unidadUsuaria.create({
        data: {
            enteId: enteAlcaldia.id,
            nombre: 'Dirección de Obras Públicas',
            nombreResponsable: 'Ing. Miguel Torres',
            cargoResponsable: 'Director de Obras',
            createdBy: adminAlcaldia.id,
        },
    });
    console.log(`✅ Autoridad: ${autoridad.nombreCompleto}`);
    console.log(`✅ Comisión: ${comision.denominacion} (3 miembros)`);
    console.log(`✅ Unidad Usuaria: ${unidadUsuaria.nombre}\n`);
    console.log('🏢 Creando Proveedores...');
    const proveedor1 = await prisma.proveedor.create({
        data: {
            enteId: enteAlcaldia.id,
            nombre: 'Construcciones Modernas C.A.',
            rif: 'J-40001234-5',
            correo: 'info@construccionesmodernas.com',
            tipoPersona: 'JURIDICA',
            tipoEntidadJuridica: 'EMPRESA_PRIVADA',
            estado: 'Miranda',
            municipio: 'Chacao',
            direccionFiscal: 'Av. Francisco de Miranda, Torre Ejecutiva',
            telefono: '+58 212-9876543',
            nombreRepLegal: 'Arq. José Méndez',
            cedulaRepLegal: 'V-9876543',
            registroRnc: true,
            solvenciaLaboral: true,
            licenciaFuncionamientoMunicipal: true,
            areaEspecialidad: 'OBRAS',
            anosExperiencia: 15,
            patrimonioReportado: 500000000,
            nivelContratacion: 'AVANZADO',
            estatusValidacion: 'APROBADO',
            createdBy: ejecutor1.id,
        },
    });
    const proveedor2 = await prisma.proveedor.create({
        data: {
            enteId: enteAlcaldia.id,
            nombre: 'Suministros Tecnológicos del Centro S.R.L.',
            rif: 'J-30005678-9',
            correo: 'ventas@sumintec.com',
            tipoPersona: 'JURIDICA',
            tipoEntidadJuridica: 'EMPRESA_PRIVADA',
            estado: 'Distrito Capital',
            municipio: 'Libertador',
            direccionFiscal: 'Sabana Grande, C.C. Líder',
            telefono: '+58 212-7654321',
            nombreRepLegal: 'Lic. Sandra Vargas',
            cedulaRepLegal: 'V-8765432',
            registroRnc: true,
            solvenciaLaboral: true,
            licenciaFuncionamientoMunicipal: true,
            areaEspecialidad: 'BIENES',
            anosExperiencia: 8,
            patrimonioReportado: 150000000,
            nivelContratacion: 'INTERMEDIO',
            estatusValidacion: 'APROBADO',
            createdBy: ejecutor1.id,
        },
    });
    console.log(`✅ ${proveedor1.nombre} (${proveedor1.areaEspecialidad})`);
    console.log(`✅ ${proveedor2.nombre} (${proveedor2.areaEspecialidad})\n`);
    console.log('📂 Creando Expediente de Contratación...');
    const expediente = await prisma.expedienteContratacion.create({
        data: {
            enteId: enteAlcaldia.id,
            comisionId: comision.id,
            unidadUsuariaId: unidadUsuaria.id,
            autoridadId: autoridad.id,
            descripcionObjeto: 'Construcción de Centro Deportivo Comunitario',
            codigoNomenclatura: 'LP-001-2024',
            tipoContratacion: 'OBRAS',
            montoEstimadoBs: 25000000,
            montoEstimadoDolar: 5000,
            valorUcauBase: 25,
            modalidadSeleccion: 'LICITACION_PUBLICA',
            estatusProceso: 'EN_PREPARACION',
            createdBy: ejecutor1.id,
        },
    });
    await prisma.fasePreparatoria.create({
        data: {
            expedienteId: expediente.id,
            detallesTecnicosCalidad: 'Cancha multiusos cubierta, gradas para 500 personas, iluminación LED',
            alcanceCantidadesObra: '1200 m² de construcción, incluye instalaciones sanitarias y eléctricas',
            justificacionVentajas: 'Beneficiará a la comunidad de más de 5000 habitantes',
            origenCrsRegistro: true,
            diasValidezOferta: 60,
            diasVigenciaGarantiaExtension: 30,
            costoPliegoBs: 50000,
            createdBy: ejecutor1.id,
        },
    });
    await prisma.cronogramaExpediente.create({
        data: {
            expedienteId: expediente.id,
            fechaLlamadoParticipar: new Date('2024-03-01'),
            fechaInicioDisponibilidadPliego: new Date('2024-03-05'),
            fechaFinDisponibilidadPliego: new Date('2024-03-20'),
            fechaActoRecepcionAperturaSobres: new Date('2024-04-01'),
            fechaLimiteEvaluacion: new Date('2024-04-10'),
            fechaLimiteAdjudicacion: new Date('2024-04-15'),
            createdBy: ejecutor1.id,
        },
    });
    await prisma.partidaPresupuestaria.createMany({
        data: [
            {
                expedienteId: expediente.id,
                descripcionItem: 'Estructura de techo metálico con cubierta',
                codigoPartida: '45-02-001',
                unidadMedida: 'm²',
                cantidadRequerida: 1200,
                precioUnitarioEstimado: 15000,
                montoTotalRenglon: 18000000,
                createdBy: ejecutor1.id,
            },
            {
                expedienteId: expediente.id,
                descripcionItem: 'Piso deportivo de caucho',
                codigoPartida: '45-03-002',
                unidadMedida: 'm²',
                cantidadRequerida: 800,
                precioUnitarioEstimado: 8000,
                montoTotalRenglon: 6400000,
                createdBy: ejecutor1.id,
            },
        ],
    });
    console.log(`✅ Expediente: ${expediente.codigoNomenclatura}`);
    console.log(`   → ${expediente.descripcionObjeto}`);
    console.log(`   → Monto: Bs. ${expediente.montoEstimadoBs.toLocaleString()}\n`);
    console.log('═'.repeat(60));
    console.log('✅ SEEDER COMPLETADO\n');
    console.log('📊 Resumen de datos creados:');
    console.log(`   • 1 Universitas`);
    console.log(`   • 2 Entes Públicos`);
    console.log(`   • 1 Supervisor (asignado temporalmente)`);
    console.log(`   • 5 Usuarios (roles: Admin, Ejecutor, Visualizador)`);
    console.log(`   • 1 Máxima Autoridad`);
    console.log(`   • 1 Comisión (3 miembros)`);
    console.log(`   • 1 Unidad Usuaria`);
    console.log(`   • 2 Proveedores`);
    console.log(`   • 1 Expediente de Contratación (con fase preparatoria)\n`);
    console.log('🔑 Credenciales de acceso:');
    console.log(`   Universitas:  admin@universitas.com / admin123`);
    console.log(`   Admin Ente:   admin@alcaldia.gob.ve / alcaldia123`);
    console.log(`   Ejecutor:     jperez@alcaldia.gob.ve / ejecutor123`);
    console.log(`   Visualizador: lrodriguez@alcaldia.gob.ve / viewer123`);
    console.log('═'.repeat(60));
}
main()
    .catch((e) => {
    console.error('❌ Error en seeder:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map