import { Fase1Service } from './fase1.service';
import { validarCompletar } from './validators/completar.validators';

/**
 * QA 26/11 (Misael), Régimen Jurídico en dos preguntas:
 * 1. El usuario elige las normativas generales del pliego (vienen sin marcar, al menos una).
 * 2. Las normativas adicionales quedan siempre en la biblioteca del ente.
 */
describe('Régimen Jurídico (QA 26/11)', () => {
  describe('validación al completar', () => {
    const ctx = { tipoContratacion: 'BIENES', totalItemsPresupuesto: 1 };
    const errorSeleccion = 'Debe seleccionar al menos una normativa general del Régimen Jurídico.';
    const errores = (datos: Record<string, unknown>, ids?: string[]) =>
      validarCompletar('aspectos-generales', datos, {
        ...ctx,
        ...(ids && { idsNormativaGeneral: new Set(ids) }),
      });

    it('sin ninguna general elegida no deja completar', () => {
      expect(errores({})).toContain(errorSeleccion);
      expect(errores({ normativasGeneralesIds: [] })).toContain(errorSeleccion);
    });

    it('una general que ya no está activa no cuenta', () => {
      expect(errores({ normativasGeneralesIds: ['borrada'] }, ['g1'])).toContain(errorSeleccion);
    });

    it('con una general vigente pasa', () => {
      expect(errores({ normativasGeneralesIds: ['g1'] }, ['g1', 'g2'])).not.toContain(
        errorSeleccion,
      );
    });
  });

  describe('guardar Aspectos Generales', () => {
    function crear(opciones: { normativaLegal?: string | null; existentes?: string[] } = {}) {
      const fase = {
        expedienteId: 'exp-1',
        estadoAspectosGenerales: 'BORRADOR',
        normativaLegal: opciones.normativaLegal ?? null,
      };
      const prisma = {
        fasePreparatoria: {
          findUnique: jest.fn().mockResolvedValue(fase),
          findUniqueOrThrow: jest.fn().mockResolvedValue(fase),
          update: jest.fn().mockResolvedValue(fase),
        },
        expedienteContratacion: { findUnique: jest.fn().mockResolvedValue({ enteId: 'ente-1' }) },
        normativaEnte: {
          findMany: jest
            .fn()
            .mockResolvedValue(
              (opciones.existentes ?? []).map((t) => ({ textoNormativaCompleto: t })),
            ),
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        documentoGenerado: { updateMany: jest.fn() },
        pliegoGenerado: { updateMany: jest.fn() },
      };
      const servicio = new Fase1Service(prisma as never, { assertAcceso: jest.fn() } as never);
      const guardar = (body: Record<string, unknown>) =>
        servicio.guardarBorrador('exp-1', 'aspectos-generales', body, {
          id: 'u-1',
          rol: 'EJECUTOR',
          enteId: 'ente-1',
        } as never);
      return { prisma, guardar };
    }

    it('guarda las generales elegidas sin repetir', async () => {
      const { prisma, guardar } = crear();
      await guardar({ normativasGeneralesIds: ['g2', 'g1', 'g2', ''] });
      expect(prisma.fasePreparatoria.update.mock.calls[0][0].data.normativasGeneralesIds).toEqual([
        'g2',
        'g1',
      ]);
    });

    it('las adicionales quedan en la biblioteca del ente, sin repetir las que ya tiene', async () => {
      const { prisma, guardar } = crear({
        normativaLegal: JSON.stringify([
          'Ley de Timbre Fiscal del Estado Lara.',
          'Decreto N° 08497  de creación del Servicio',
          'decreto n° 08497 de creacion del servicio',
        ]),
        existentes: ['LEY DE TIMBRE FISCAL DEL ESTADO LARA'],
      });
      await guardar({ normativaLegal: ['x'] });
      expect(prisma.normativaEnte.createMany).toHaveBeenCalledWith({
        data: [
          {
            enteId: 'ente-1',
            textoNormativaCompleto: 'Decreto N° 08497 de creación del Servicio',
            createdBy: 'u-1',
            updatedBy: 'u-1',
          },
        ],
      });
    });

    it('sin adicionales no toca la biblioteca del ente', async () => {
      const { prisma, guardar } = crear();
      await guardar({ diasValidezOferta: 30 });
      expect(prisma.normativaEnte.createMany).not.toHaveBeenCalled();
    });
  });
});
