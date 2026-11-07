import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { expandirBloques, type CondicionesBloques } from './bloques-contrato';
import { mapDatosContrato, ordinalClausula } from './documentos-fase4.mapper';
import { LINEA_VACIA, renderizarPildoras } from './pildoras.util';
import { resolverTokens } from './tokens-contrato.resolver';

// La semilla vive fuera de `src`, así que no se puede importar con tipos.
const { CLAUSULAS_GENERICAS_SEED } = jest.requireActual<{
  CLAUSULAS_GENERICAS_SEED: Array<{ titulo: string; cuerpo: string }>;
}>(path.join(__dirname, '../../prisma/data/clausulas-genericas.data'));

const SIN_BLOQUES: CondicionesBloques = {
  retencionFielCumplimiento: false,
  anticipoContrato: false,
  requiereGarantiaLaboral: false,
  retencionFianzaLaboral: false,
  polizaResponsabilidadCivil: false,
};
const CON_BLOQUES: CondicionesBloques = {
  retencionFielCumplimiento: true,
  anticipoContrato: true,
  requiereGarantiaLaboral: true,
  retencionFianzaLaboral: true,
  polizaResponsabilidadCivil: true,
};

const TOKENS = resolverTokens({
  ente: {
    nombre: 'GOBERNACIÓN',
    rif: 'G-1',
    organoAdscripcion: 'MINISTERIO',
    ciudad: 'Los Teques',
  },
  expediente: { descripcionObjeto: 'Adquisición de insumos', codigoNomenclatura: 'CA-001-2026' },
  oferta: {
    nombreProveedorOferente: 'ALFA, C.A.',
    rifProveedorOferente: 'J-1',
    nombreRepLegalOferente: 'Ana Pérez',
    cedulaRepLegalOferente: '12.345.678',
    datosRegistroMercantilProveedorOferente: 'Registro Mercantil Primero',
  },
  montoContratoBs: 1000000,
  partidasPresupuestarias: '4.02.01',
  plazoEjecucionDias: 30,
  fase1: {
    porcentajeFielCumplimiento: 10,
    porcentajeGarantiaLaboral: 5,
    porcentajeAnticipo: 20,
    porcentajeResponsabilidadSocial: 3,
    lugarLogisticaEjecucion: 'Los Teques',
    porcentajeResponsabilidadCivil: 2,
    montoResponsabilidadCivilBs: 50000,
    modalidadCrs: 'Aporte social',
    unidadRespCumplimientoCrs: 'Oficina de Gestión Social',
  },
  montoManoObraOfertado: 200000,
  nombreUnidadUsuaria: 'Dirección de Salud',
});

const DOCUMENTO = {
  bloques: CON_BLOQUES,
  firmas: {
    nom_completo_autoridad: 'María Gómez',
    nom_completo_delegado: '',
    cedula_autoridad: '9.876.543',
    cedula_delegado: '',
    cargo_oficial_autoridad: 'Gobernadora',
    cargo_oficial_delegado: '',
    datos_designacion_autoridad: 'Decreto 1',
    datos_designacion_delegado: '',
  },
  fechaFirma: '20 de octubre de 2026',
};

const CLAUSULAS = CLAUSULAS_GENERICAS_SEED.map((c, i) => ({
  order: i + 1,
  titulo: c.titulo,
  cuerpoHtml: c.cuerpo,
}));

function renderizarPlantillaReal() {
  const plantilla = path.join(
    __dirname,
    '../generador-documentos/templates/contrato-fase4-template.docx',
  );
  const doc = new Docxtemplater(new PizZip(fs.readFileSync(plantilla, 'binary')), {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{', end: '}' },
  });
  doc.render(mapDatosContrato(TOKENS, CLAUSULAS, DOCUMENTO));
  return (doc.getZip().file('word/document.xml')?.asText() ?? '').replace(/<[^>]+>/g, '');
}

describe('ordinalClausula', () => {
  it.each([
    [1, 'PRIMERA'],
    [9, 'NOVENA'],
    [10, 'DÉCIMA'],
    [11, 'DÉCIMA PRIMERA'],
    [20, 'VIGÉSIMA'],
    [22, 'VIGÉSIMA SEGUNDA'],
  ])('%i → %s', (numero, texto) => {
    expect(ordinalClausula(numero)).toBe(texto);
  });
});

describe('marcas con llaves de las cláusulas', () => {
  it('se resuelven como cualquier otra variable', () => {
    const salida = renderizarPildoras(
      'De {desc_objeto_contratacion_au_au} en {nom_ente_contratante}.',
      TOKENS,
      'VALOR',
    );
    expect(salida).toBe('De Adquisición de insumos en GOBERNACIÓN.');
  });

  it('un porcentaje no sale con doble signo', () => {
    const salida = renderizarPildoras(
      'Equivalente al {porcentaje_responsabilidad_social_au_au}% del monto.',
      TOKENS,
      'VALOR',
    );
    expect(salida).toBe('Equivalente al 3% del monto.');
  });

  it('una llave que no es variable se deja como está', () => {
    expect(renderizarPildoras('Texto {otra_cosa}.', TOKENS, 'VALOR')).toBe('Texto {otra_cosa}.');
  });
});

describe('expandirBloques', () => {
  const GARANTIAS = 'LCP, {retencion_fiel_cumplimiento_au_au}. {modelo_anticipo_contrato_au_au}';

  it('sin lo marcado en Fase 1 no deja rastro', () => {
    expect(expandirBloques(GARANTIAS, SIN_BLOQUES)).toBe('LCP.');
  });

  it('agrega la retención y el párrafo del anticipo', () => {
    const salida = expandirBloques(GARANTIAS, CON_BLOQUES);
    expect(salida).toContain('LCP, o someterse a la retención equivalente del 10%');
    expect(salida).toContain('<br>- Garantía de Anticipo:');
  });

  it('la fianza laboral lleva su retención solo si aplica', () => {
    const marca = '{modelo_garantia_laboral_au_au}';
    expect(expandirBloques(marca, CON_BLOQUES)).toContain('retención equivalente del cinco');
    expect(expandirBloques(marca, { ...CON_BLOQUES, retencionFianzaLaboral: false })).not.toContain(
      'retención equivalente del cinco',
    );
  });

  it('expandir dos veces no cambia nada', () => {
    const una = expandirBloques(GARANTIAS, CON_BLOQUES);
    expect(expandirBloques(una, CON_BLOQUES)).toBe(una);
  });
});

describe('contrato con la plantilla real y las cláusulas de la semilla', () => {
  const texto = renderizarPlantillaReal();

  it('no deja marcas sin reemplazar', () => {
    expect(texto).not.toMatch(/\{[^}]*\}/);
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('<span');
  });

  it('llena encabezado, contratista y firma', () => {
    expect(texto).toContain('Entre el GOBERNACIÓN, ente adscrito a MINISTERIO, con RIF N° G-1');
    expect(texto).toContain('sociedad mercantíl ALFA, C.A.');
    expect(texto).toContain('María Gómez');
    expect(texto).toContain('20 de octubre de 2026');
  });

  it('numera las cláusulas en ordinal', () => {
    expect(texto).toContain('CLÁUSULA PRIMERA: OBJETO DEL CONTRATO');
    expect(texto).toContain('CLÁUSULA VIGÉSIMA SEGUNDA:');
  });

  it('los montos no repiten la moneda', () => {
    expect(texto).not.toContain('Bs. Bs.');
    expect(texto).not.toMatch(/BOLÍVARES Bolívares/);
    expect(texto).toContain('DIECISEIS MIL Bolívares (Bs. 16.000,00)');
  });

  it('incluye los bloques de garantías con sus montos', () => {
    expect(texto).toContain('DIEZ MIL Bolívares (Bs. 10.000,00)');
    expect(texto).toContain('CINCUENTA MIL Bolívares (Bs. 50.000,00)');
    expect(texto).toContain('al 2% del Contrato');
  });

  it('lo que no tiene fuente sale como línea', () => {
    expect(texto).toContain(LINEA_VACIA);
  });
});
