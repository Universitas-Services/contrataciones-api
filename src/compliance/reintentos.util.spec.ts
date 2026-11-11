import { decidir, TIEMPO_MAXIMO_MS } from './reintentos.util';

const INICIO = new Date('2026-11-11T10:00:00.000Z');
const NUEVO = { intentos429: 0, fallosTemporales: 0, primerIntentoAt: INICIO };
const UN_MINUTO_DESPUES = new Date(INICIO.getTime() + 60_000);

describe('decidir (sección 8 del contrato)', () => {
  it('200 termina', () => {
    expect(decidir({ status: 200 }, NUEVO, UN_MINUTO_DESPUES)).toEqual({ tipo: 'OK' });
  });

  it.each([400, 413, 415])('%i rechaza el archivo sin reintentar', (status) => {
    const decision = decidir({ status, detalle: 'PDF sin texto' }, NUEVO, UN_MINUTO_DESPUES);
    expect(decision).toEqual({ tipo: 'RECHAZADO', detalle: 'PDF sin texto' });
  });

  it.each([401, 422, 500])('%i es error definitivo', (status) => {
    const decision = decidir({ status }, NUEVO, UN_MINUTO_DESPUES);
    expect(decision).toMatchObject({ tipo: 'ERROR', definitivo: true });
  });

  it('503 con Retry-After espera esos segundos sin gastar fallos', () => {
    const decision = decidir({ status: 503, retryAfterS: 7 }, NUEVO, UN_MINUTO_DESPUES);
    expect(decision).toEqual({
      tipo: 'REINTENTAR',
      esperaMs: 7000,
      intentos429: 0,
      fallosTemporales: 0,
    });
  });

  it('429 espera 15, 30, 60 y luego siempre 120 segundos', () => {
    const esperas = [0, 1, 2, 3, 4].map((intentos429) => {
      const d = decidir({ status: 429 }, { ...NUEVO, intentos429 }, UN_MINUTO_DESPUES);
      return d.tipo === 'REINTENTAR' ? [d.esperaMs, d.intentos429] : null;
    });
    expect(esperas).toEqual([
      [15000, 1],
      [30000, 2],
      [60000, 3],
      [120000, 4],
      [120000, 5],
    ]);
  });

  it.each([502, 503, 504, null])('%s cuenta como fallo temporal con espera creciente', (status) => {
    const primero = decidir({ status }, NUEVO, UN_MINUTO_DESPUES);
    const tercero = decidir({ status }, { ...NUEVO, fallosTemporales: 2 }, UN_MINUTO_DESPUES);
    expect(primero).toMatchObject({ tipo: 'REINTENTAR', esperaMs: 15000, fallosTemporales: 1 });
    expect(tercero).toMatchObject({ tipo: 'REINTENTAR', esperaMs: 45000, fallosTemporales: 3 });
  });

  it('el cuarto fallo temporal deja el trabajo en ERROR reintentable por el usuario', () => {
    const decision = decidir({ status: 502 }, { ...NUEVO, fallosTemporales: 3 }, UN_MINUTO_DESPUES);
    expect(decision).toMatchObject({ tipo: 'ERROR', definitivo: false });
  });

  it('pasados 30 minutos desde el primer intento no se reintenta más', () => {
    const tarde = new Date(INICIO.getTime() + TIEMPO_MAXIMO_MS);
    expect(decidir({ status: 429 }, NUEVO, tarde)).toMatchObject({
      tipo: 'ERROR',
      definitivo: false,
    });
    expect(decidir({ status: 503, retryAfterS: 1 }, NUEVO, tarde)).toMatchObject({ tipo: 'ERROR' });
  });
});
