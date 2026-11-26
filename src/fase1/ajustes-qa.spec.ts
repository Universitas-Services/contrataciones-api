import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEnteUsuarioDto } from '../entes/dto/create-ente-usuario.dto';
import { ActividadesPreviasDto } from './dto/actividades-previas.dto';
import { AspectosGeneralesDto } from './dto/aspectos-generales.dto';
import { Fase1Service } from './fase1.service';
import { huboCambios } from './invalidacion-documentos.util';
import { validarCompletar } from './validators/completar.validators';
import { CronogramaEnteService } from '../cronograma-ente/cronograma-ente.service';

const ctx = { tipoContratacion: 'BIENES', totalItemsPresupuesto: 1 };

async function erroresDe<T extends object>(clase: new () => T, datos: object) {
  const errores = await validate(plainToInstance(clase, datos) as object);
  return errores.map((e) => e.property);
}

describe('QA 1 — contraseña con cualquier símbolo', () => {
  const usuario = (password: string) => ({
    nombre: 'Ana',
    apellido: 'Pérez',
    email: 'ana@ente.gob.ve',
    password,
    rol: 'EJECUTOR',
  });

  it.each(['Temporal123#', 'Temporal123.', 'Temporal123*', 'Temporal123$', 'Temporal123-'])(
    'acepta %s',
    async (clave) => {
      expect(await erroresDe(CreateEnteUsuarioDto, usuario(clave))).not.toContain('password');
    },
  );

  it.each(['Temporal123', 'temporal123#', 'TEMPORAL123#', 'Tempo1#'])(
    'rechaza %s',
    async (clave) => {
      expect(await erroresDe(CreateEnteUsuarioDto, usuario(clave))).toContain('password');
    },
  );
});

describe('QA 3 — justificaciones de hasta 4000 caracteres', () => {
  it('acepta 4000 y rechaza 4001', async () => {
    const largo = (n: number) => ({
      justificacionNecesidadContratacion: 'a'.repeat(n),
      justificacionVentajas: 'b'.repeat(n),
    });
    expect(await erroresDe(ActividadesPreviasDto, largo(4000))).toEqual([]);
    expect(await erroresDe(ActividadesPreviasDto, largo(4001))).toEqual([
      'justificacionNecesidadContratacion',
      'justificacionVentajas',
    ]);
  });
});

describe('QA 4 — porcentajes con límites legales', () => {
  it('garantía laboral de 0 a 10 en el DTO', async () => {
    expect(await erroresDe(ActividadesPreviasDto, { porcentajeGarantiaLaboral: 10 })).toEqual([]);
    expect(await erroresDe(ActividadesPreviasDto, { porcentajeGarantiaLaboral: 11 })).toEqual([
      'porcentajeGarantiaLaboral',
    ]);
  });

  it('CRS de 0 a 3 y fiel cumplimiento de 20 a 100 en el DTO', async () => {
    expect(
      await erroresDe(AspectosGeneralesDto, {
        porcentajeResponsabilidadSocial: 3,
        porcentajeFielCumplimiento: 20,
      }),
    ).toEqual([]);
    expect(
      await erroresDe(AspectosGeneralesDto, {
        porcentajeResponsabilidadSocial: 4,
        porcentajeFielCumplimiento: 19,
      }),
    ).toEqual(['porcentajeResponsabilidadSocial', 'porcentajeFielCumplimiento']);
  });

  it('también al completar los módulos', () => {
    const actividades = validarCompletar(
      'actividades-previas',
      { requiereGarantiaLaboral: true, porcentajeGarantiaLaboral: 12 },
      ctx,
    );
    expect(actividades).toContain('El porcentaje de garantía laboral debe estar entre 0 y 10.');

    const aspectos = validarCompletar(
      'aspectos-generales',
      { porcentajeResponsabilidadSocial: 5, porcentajeFielCumplimiento: 10 },
      ctx,
    );
    expect(aspectos).toContain('El porcentaje de CRS debe estar entre 0 y 3.');
    expect(aspectos).toContain('El porcentaje de fiel cumplimiento debe estar entre 20 y 100.');
  });
});

describe('QA 5 y 9 — validaciones que ya no aplican', () => {
  it('la evaluación técnico-económica no valida una puntuación mínima', () => {
    const criterio = (puntuacion: number) => ({
      criterios: [
        {
          id: 'c',
          nombre: 'Criterio',
          puntuacion,
          descripcion: 'd',
          rangos: [{ descripcion: 'r', puntaje: puntuacion }],
        },
      ],
      puntuacionMinima: 999,
    });
    const errores = validarCompletar(
      'evaluacion-tecnica-economica',
      { tecnica: criterio(40), economica: criterio(60) },
      ctx,
    );
    expect(errores.join(' ')).not.toMatch(/mínima/);
  });

  it('las normativas adicionales son opcionales', () => {
    // Las generales sí se eligen (QA 26/11); las adicionales siguen siendo opcionales.
    const errores = validarCompletar(
      'aspectos-generales',
      { normativaLegal: [], normativasGeneralesIds: ['g1'] },
      ctx,
    );
    expect(errores.join(' ')).not.toMatch(/normativa/i);
  });
});

describe('QA — cronograma sin ente', () => {
  it('UNIVERSITAS calcula con fines de semana, sin consultar feriados de un ente', async () => {
    const prisma = { diaNoLaborableEnte: { findMany: jest.fn() } };
    const servicio = new CronogramaEnteService(prisma as never);
    await expect(servicio.getDiasNoLaborablesParaCalculo(undefined as never)).resolves.toEqual([]);
    expect(prisma.diaNoLaborableEnte.findMany).not.toHaveBeenCalled();
  });
});

describe('QA 8 — documentos desactualizados solo con cambios reales', () => {
  it('huboCambios ignora el orden de las llaves y compara decimales y fechas', () => {
    expect(huboCambios({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(false);
    expect(huboCambios({ f: new Date('2026-01-01') }, { f: new Date('2026-01-01') })).toBe(false);
    expect(huboCambios({ m: { toJSON: () => '1500' } }, { m: { toJSON: () => '1500' } })).toBe(
      false,
    );
    expect(huboCambios({ a: 1 }, { a: 2 })).toBe(true);
    expect(huboCambios({ a: undefined }, { a: null })).toBe(false);
  });

  function crear(antes: Record<string, unknown>, despues: Record<string, unknown>) {
    const fase = (datos: Record<string, unknown>) => ({
      expedienteId: 'exp-1',
      estadoLlamado: 'COMPLETADO',
      ...datos,
    });
    const prisma = {
      fasePreparatoria: {
        findUnique: jest.fn().mockResolvedValue(fase(antes)),
        findUniqueOrThrow: jest.fn().mockResolvedValue(fase(antes)),
        update: jest.fn().mockResolvedValue(fase(despues)),
      },
      documentoGenerado: { updateMany: jest.fn() },
      pliegoGenerado: { updateMany: jest.fn() },
    };
    const acceso = { assertAcceso: jest.fn() };
    const servicio = new Fase1Service(prisma as never, acceso as never);
    return { servicio, prisma };
  }

  const user = { id: 'u', enteId: 'e', rol: 'EJECUTOR' } as never;

  it('guardar sin cambios no marca nada', async () => {
    const { servicio, prisma } = crear({ costoPliegoBs: 1500 }, { costoPliegoBs: 1500 });
    await servicio.guardarBorrador('exp-1', 'llamado', { costoPliegoBs: 1500 }, user);
    expect(prisma.documentoGenerado.updateMany).not.toHaveBeenCalled();
    expect(prisma.pliegoGenerado.updateMany).not.toHaveBeenCalled();
  });

  it('un cambio real marca solo los documentos que dependen del módulo', async () => {
    const { servicio, prisma } = crear({ costoPliegoBs: 1500 }, { costoPliegoBs: 2000 });
    await servicio.guardarBorrador('exp-1', 'llamado', { costoPliegoBs: 2000 }, user);

    const filtro = prisma.documentoGenerado.updateMany.mock.calls[0][0].where;
    expect(filtro.tipoDocumento.in).toEqual(
      expect.arrayContaining(['LLAMADO_PARTICIPAR', 'PLIEGO_CONDICIONES', 'ACTA_APERTURA']),
    );
    for (const ajeno of ['ACTIVIDADES_PREVIAS', 'ACTA_INICIO', 'LISTA_COTEJO']) {
      expect(filtro.tipoDocumento.in).not.toContain(ajeno);
    }
    expect(prisma.pliegoGenerado.updateMany).toHaveBeenCalled();
  });

  it('reabrir un módulo no marca nada por sí solo', async () => {
    const { servicio, prisma } = crear({}, {});
    await servicio.reabrir('exp-1', 'llamado', user);
    expect(prisma.documentoGenerado.updateMany).not.toHaveBeenCalled();
  });
});
