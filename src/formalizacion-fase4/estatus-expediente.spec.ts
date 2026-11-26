import { FormalizacionFase4Service } from './formalizacion-fase4.service';

/** Punto 41: el estatus del expediente sigue a la adjudicación y al contrato. */
describe('Estatus del expediente por la adjudicación (41)', () => {
  const generado = { estado: 'GENERADO', documentoId: 'd' };
  const adj = (contrato: object | null = null) => ({ estatus: 'ADJUDICADO', contrato });

  function servicio(
    estatusProceso: string,
    oferentes: object[],
    { cicloActivo = null as object | null, faseHabilitada = true, sellado = false } = {},
  ) {
    const update = jest.fn().mockResolvedValue({});
    const s = new FormalizacionFase4Service(
      { expedienteContratacion: { update } } as never,
      {} as never,
    );
    jest
      .spyOn(s, 'cargarExpediente')
      .mockResolvedValue({ estatusProceso, selladoFase4At: sellado ? new Date() : null } as never);
    jest
      .spyOn(s, 'getEstado')
      .mockResolvedValue({ oferentes, cicloActivo, gates: { faseHabilitada } } as never);
    const user = { id: 'u' } as never;
    return {
      a: async () => {
        await s.sincronizarEstatus('x', user);
        return update.mock.calls[0]?.[0].data.estatusProceso ?? 'sin cambio';
      },
    };
  }

  it.each([
    [
      'dictamen guardado',
      'EN_EVALUACION',
      [adj(), { estatus: 'RESERVA', contrato: null }],
      {},
      'ADJUDICADO',
    ],
    ['contrato generado', 'ADJUDICADO', [adj(generado)], {}, 'CONTRATADO'],
    [
      'contrato sin Word',
      'ADJUDICADO',
      [adj({ estado: 'GENERADO', documentoId: null })],
      {},
      'sin cambio',
    ],
    [
      'parcial: falta un contrato',
      'ADJUDICADO',
      [adj(generado), adj({ estado: 'BORRADOR' })],
      {},
      'sin cambio',
    ],
    [
      'decaimiento sobre el contratado',
      'CONTRATADO',
      [{ estatus: 'EN_DECAIMIENTO', contrato: generado }],
      { cicloActivo: {} },
      'ADJUDICADO',
    ],
    ['se deshace el decaimiento', 'ADJUDICADO', [adj(generado)], {}, 'CONTRATADO'],
    [
      'asume el subsiguiente, sin contrato',
      'CONTRATADO',
      [{ estatus: 'DECAIDO', contrato: generado }, adj()],
      {},
      'ADJUDICADO',
    ],
    [
      'ya no queda ningún adjudicado',
      'ADJUDICADO',
      [{ estatus: 'RESERVA', contrato: null }],
      {},
      'EN_EVALUACION',
    ],
    ['sin dictámenes (flujo viejo)', 'CONTRATADO', [], { faseHabilitada: false }, 'sin cambio'],
    ['desierto', 'DESIERTO', [adj()], {}, 'sin cambio'],
    ['anulado', 'ANULADO', [adj(generado)], {}, 'sin cambio'],
    ['sellado', 'ADJUDICADO', [adj(generado)], { sellado: true }, 'sin cambio'],
  ])('%s: %s → %s', async (_, actual, oferentes, opciones, esperado) => {
    expect(await servicio(actual, oferentes, opciones).a()).toBe(esperado);
  });
});
