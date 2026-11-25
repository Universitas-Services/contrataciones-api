import { valorUnitarioUcau } from './valor-ucau.util';
import { ContratoFormalizadoService } from '../../contrato-formalizado/contrato-formalizado.service';
import { ExpedienteContratacionService } from '../../expediente-contratacion/expediente-contratacion.service';

describe('Valor unitario del UCAU', () => {
  it('usa el guardado; si falta, lo calcula; si no se puede, 0', () => {
    const montos = { montoEstimadoBs: '4496352500', valorUcauBase: '112408812.5' };
    expect(valorUnitarioUcau({ ...montos, valorUcau: '41.5' })).toBe(41.5);
    expect(valorUnitarioUcau({ ...montos, valorUcau: null })).toBe(40);
    expect(valorUnitarioUcau({ montoEstimadoBs: 100, valorUcauBase: 0 })).toBe(0);
    expect(valorUnitarioUcau(null)).toBe(0);
  });

  it('el contrato se convierte con el valor unitario', async () => {
    const update = jest.fn().mockResolvedValue({});
    const modalidad = { montoEstimadoBs: 4000, valorUcauBase: 100, valorUcau: null };
    const prisma = {
      adjudicacion: {
        findUnique: jest.fn().mockResolvedValue({ id: 'a', expediente: { modalidad } }),
      },
      contratoFormalizado: { findUnique: jest.fn().mockResolvedValue({ id: 'c' }), update },
    };
    const servicio = new ContratoFormalizadoService(prisma as never);
    await servicio.update('x', { montoContratoBs: 2000 } as never, 'u').catch(() => null);
    expect(update.mock.calls[0][0].data.valorUcauContrato).toBe(50);
  });

  const guardar = async (dto: object) => {
    const update = jest.fn().mockResolvedValue({});
    const prisma: Record<string, unknown> = {
      expedienteContratacion: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({
          id: 'x',
          enteId: 'e',
          modalidadId: 'm',
          modalidad: { montoEstimadoBs: 4000, valorUcauBase: 100, valorUcau: 40 },
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      modalidadContratacion: { update },
      documentoGenerado: { updateMany: jest.fn() },
      pliegoGenerado: { updateMany: jest.fn() },
    };
    prisma.$transaction = (fn: (tx: unknown) => unknown) => fn(prisma);
    const servicio = new ExpedienteContratacionService(prisma as never, {} as never);
    await (servicio as any).updateGeneral('x', dto, 'u', 'e', 'EJECUTOR');
    return update.mock.calls[0]?.[0].data.valorUcau;
  };

  it('al editar montos sin UCAU se descarta el viejo; sin cambios se conserva', async () => {
    expect(await guardar({ montoEstimadoBs: 8000, valorUcauBase: 100, valorUcau: 80 })).toBe(80);
    expect(await guardar({ montoEstimadoBs: 8000, valorUcauBase: 100 })).toBeNull();
    expect(await guardar({ montoEstimadoBs: 4000, valorUcauBase: 100 })).toBeUndefined();
  });
});
