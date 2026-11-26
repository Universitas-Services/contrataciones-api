import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AspectosGeneralesDto } from './dto/aspectos-generales.dto';
import { ActividadesPreviasDto } from './dto/actividades-previas.dto';
import { validarCompletar } from './validators/completar.validators';

/**
 * QA 26/11 (Misael, Carlos): el campo se llena de derecha a izquierda, así que
 * «21» llega como 0,21. El borrador lo rechazaba y el usuario quedaba trabado
 * en el formulario. Ahora el borrador acepta de 0 a 100 y el rango legal se
 * valida solo al completar.
 */
describe('Porcentajes a medio llenar en el borrador (QA 26/11)', () => {
  const errores = (Dto: new () => object, datos: object) =>
    validateSync(plainToInstance(Dto, datos)).map((e) => e.property);

  it.each([
    ['porcentajeFielCumplimiento', AspectosGeneralesDto],
    ['porcentajeResponsabilidadSocial', AspectosGeneralesDto],
    ['porcentajeGarantiaLaboral', ActividadesPreviasDto],
  ] as const)('el borrador acepta %s fuera del rango legal', (campo, Dto) => {
    expect(errores(Dto, { [campo]: 0.21 })).toEqual([]);
    expect(errores(Dto, { [campo]: 50 })).toEqual([]);
  });

  it.each([-1, 100.01, 1000])('el borrador rechaza %s (no cabe como porcentaje)', (valor) => {
    expect(errores(AspectosGeneralesDto, { porcentajeFielCumplimiento: valor })).toEqual([
      'porcentajeFielCumplimiento',
    ]);
  });

  it('completar sigue exigiendo el rango legal', () => {
    const ctx = { tipoContratacion: 'BIENES', totalItemsPresupuesto: 1 };
    expect(
      validarCompletar(
        'aspectos-generales',
        { porcentajeFielCumplimiento: 0.21, porcentajeResponsabilidadSocial: 5 },
        ctx,
      ),
    ).toEqual(
      expect.arrayContaining([
        'El porcentaje de fiel cumplimiento debe estar entre 20 y 100.',
        'El porcentaje de CRS debe estar entre 0 y 3.',
      ]),
    );
  });
});
