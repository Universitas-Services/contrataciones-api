import { calcularVencimientos, sumarDiasHabiles, type DiaNoLaborable } from './dias-habiles.util';

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const dia = (fecha: Date) => fecha.toISOString().slice(0, 10);

const feriado = (iso: string): DiaNoLaborable => ({
  fecha: utc(iso),
  fechaRecurrente: null,
  esRecurrente: false,
});

const recurrente = (mmdd: string): DiaNoLaborable => ({
  fecha: null,
  fechaRecurrente: mmdd,
  esRecurrente: true,
});

describe('sumarDiasHabiles', () => {
  it('no cuenta el día de la notificación: el lapso corre desde el siguiente', () => {
    // Lunes 5 de octubre de 2026 + 1 hábil = martes 6.
    expect(dia(sumarDiasHabiles(utc('2026-10-05'), 1, []))).toBe('2026-10-06');
  });

  it('salta sábados y domingos', () => {
    // Jueves 1 + 5 hábiles: vi 2, lu 5, ma 6, mi 7, ju 8.
    expect(dia(sumarDiasHabiles(utc('2026-10-01'), 5, []))).toBe('2026-10-08');
  });

  it('salta los días no laborables puntuales del ente', () => {
    // Mismo caso, pero el lunes 5 es feriado del ente: corre un día.
    const resultado = sumarDiasHabiles(utc('2026-10-01'), 5, [feriado('2026-10-05')]);
    expect(dia(resultado)).toBe('2026-10-09');
  });

  it('salta los feriados recurrentes sin importar el año', () => {
    // 2026-10-12 es lunes y está marcado como recurrente 10-12.
    const resultado = sumarDiasHabiles(utc('2026-10-08'), 2, [recurrente('10-12')]);
    // vi 9 (1), lu 12 feriado, ma 13 (2).
    expect(dia(resultado)).toBe('2026-10-13');
  });

  it('empezando un viernes, el primer hábil es el lunes', () => {
    expect(dia(sumarDiasHabiles(utc('2026-10-02'), 1, []))).toBe('2026-10-05');
  });
});

describe('calcularVencimientos', () => {
  it('da 5 días hábiles para garantías y 8 para la firma', () => {
    const { fechaVencimientoGarantias, fechaVencimientoFirmaContrato } = calcularVencimientos(
      utc('2026-10-13'),
      [],
    );
    // Martes 13: mi 14, ju 15, vi 16, lu 19, ma 20 (5).
    expect(dia(fechaVencimientoGarantias)).toBe('2026-10-20');
    // … mi 21, ju 22, vi 23 (8).
    expect(dia(fechaVencimientoFirmaContrato)).toBe('2026-10-23');
  });

  it('el vencimiento de firma nunca es anterior al de garantías', () => {
    const { fechaVencimientoGarantias, fechaVencimientoFirmaContrato } = calcularVencimientos(
      utc('2026-12-23'),
      [feriado('2026-12-24'), feriado('2026-12-25'), recurrente('01-01')],
    );
    expect(fechaVencimientoFirmaContrato.getTime()).toBeGreaterThan(
      fechaVencimientoGarantias.getTime(),
    );
  });
});
