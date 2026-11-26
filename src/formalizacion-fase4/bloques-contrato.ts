/**
 * Bloques condicionales de la tarjeta de garantías del modelo de contrato.
 *
 * Son marcas que no valen un dato sino un párrafo legal, y que aparecen o no según
 * lo marcado en la Fase 1. Se expanden antes de resolver las variables, porque
 * sus textos llevan variables adentro. Una vez expandidos el usuario los edita
 * como cualquier otro texto, y expandir dos veces no cambia nada.
 *
 * Textos: "LÓGICA PARA MODELO DE CONTRATO" de la documentación.
 *
 * Cada bloque puede llegar de dos formas: como marca con llaves (las cláusulas
 * de la biblioteca) o como píldora (lo que guarda el editor de la Fase 1). En
 * el editor de la Fase 1 la píldora muestra solo un título corto, porque no
 * parte líneas; el párrafo se arma en el Pliego y en el contrato.
 */
import { TOKENS_POR_ID } from '../biblioteca/constants/tokens-contrato.constants';
import { reemplazarPildoras } from './pildoras.util';

export interface CondicionesBloques {
  retencionFielCumplimiento: boolean;
  anticipoContrato: boolean;
  requiereGarantiaLaboral: boolean;
  retencionFianzaLaboral: boolean;
  polizaResponsabilidadCivil: boolean;
}

/** Cada bloque, la casilla de la tarjeta 8 que lo activa y su nombre. */
const BLOQUES: { id: string; condicion: keyof CondicionesBloques; nombre: string }[] = [
  {
    id: 'retencion_fiel_cumplimiento_au_au',
    condicion: 'retencionFielCumplimiento',
    nombre: 'Retención de fiel cumplimiento',
  },
  {
    id: 'modelo_anticipo_contrato_au_au',
    condicion: 'anticipoContrato',
    nombre: 'Garantía de anticipo',
  },
  {
    id: 'modelo_garantia_laboral_au_au',
    condicion: 'requiereGarantiaLaboral',
    nombre: 'Garantía laboral',
  },
  {
    id: 'modelo_poliza_responsabilidad_civil_au_au',
    condicion: 'polizaResponsabilidadCivil',
    nombre: 'Póliza de responsabilidad civil',
  },
];

export const IDS_BLOQUES: ReadonlySet<string> = new Set(BLOQUES.map((b) => b.id));

/** Las casillas de la tarjeta 8, leídas de la fase preparatoria. */
export function condicionesDe(
  fase: Partial<Record<keyof CondicionesBloques, unknown>> | null | undefined,
): CondicionesBloques {
  return {
    retencionFielCumplimiento: fase?.retencionFielCumplimiento === true,
    anticipoContrato: fase?.anticipoContrato === true,
    requiereGarantiaLaboral: fase?.requiereGarantiaLaboral === true,
    retencionFianzaLaboral: fase?.retencionFianzaLaboral === true,
    polizaResponsabilidadCivil: fase?.polizaResponsabilidadCivil === true,
  };
}

/** Lo que se lee en el campo `select` de Prisma para `condicionesDe`. */
export const SELECT_CONDICIONES = {
  retencionFielCumplimiento: true,
  anticipoContrato: true,
  requiereGarantiaLaboral: true,
  retencionFianzaLaboral: true,
  polizaResponsabilidadCivil: true,
} as const;

/**
 * Texto de cada píldora de bloque en el editor de la Fase 1: su título si
 * aplica, o «No aplica: …» si en la tarjeta 8 se marcó que no.
 */
export function titulosBloques(condiciones: CondicionesBloques): Record<string, string> {
  return Object.fromEntries(
    BLOQUES.map((b) => [
      b.id,
      condiciones[b.condicion]
        ? `[${TOKENS_POR_ID.get(b.id)?.etiqueta ?? b.nombre}]`
        : `No aplica: ${b.nombre}`,
    ]),
  );
}

const RETENCION_FIEL = 'o someterse a la retención equivalente del 10% sobre los pagos realizados';

const ANTICIPO =
  '- Garantía de Anticipo: En caso de que “EL CONTRATANTE” otorgue un anticipo, el cual no podrá exceder el 50% del monto del contrato conforme al artículo 122 de la Ley de Contrataciones Públicas, “LA CONTRATISTA” deberá constituir previamente una garantía por el cien por ciento (100%) del monto otorgado. Dicha garantía deberá mantenerse vigente hasta la total amortización del anticipo, la cual se efectuará mediante deducciones proporcionales en los pagos correspondientes.';

const RETENCION_FIANZA =
  ', o se aplicará retención equivalente del cinco por ciento (5%), de conformidad con el artículo 124 de la LCP';

const garantiaLaboral = (retencion: string) =>
  `- Garantía Laboral: “LA CONTRATISTA” deberá constituir a favor y a satisfacción de “EL CONTRATANTE”, debidamente autenticada y emitida por una Institución Bancaria o Compañía de Seguros debidamente inscrita por ante la Superintendencia respectiva o Sociedad Nacional de Garantías Recíprocas para la Mediana y Pequeña Industria, por un monto equivalente al {porcentaje_garantia_laboral_au_au}% del costo total de la mano de obra mensual incluida en la estructura de costos de su oferta, la fianza es de [MONTO FIANZA LABORAL LETRAS] Bolívares (Bs. [MONTO FIANZA LABORAL NUMEROS]) la cual deberá permanecer vigente por la duración del contrato y/o que se verifique el definitivo cumplimiento de la obligación afianzada${retencion}.`;

const POLIZA =
  '- Póliza de Responsabilidad Civil: “LA CONTRATISTA” se obliga a constituir y mantener vigente durante todo el plazo de ejecución del contrato, una Póliza de Responsabilidad Civil que ampare los daños, pérdidas o perjuicios que pudieren ocasionarse a personas o a la propiedad de terceros, con ocasión de {desc_objeto_contratacion_au_au}.<br>' +
  'Dicha cobertura deberá incluir, sin limitarse a, los daños derivados de los trabajos, el uso de maquinaria, las acciones del personal del contratista y, en caso de que aplique a la naturaleza del servicio, la Responsabilidad Civil Profesional por errores u omisiones.<br>' +
  'La póliza deberá ser emitida por una empresa de seguros de reconocida solvencia en la República, por un monto no menor a [MONTO RESPONSABILIDAD CIVIL LETRAS] Bolívares (Bs. {monto_responsabilidad_civil_bs_au_au}). o al {porcentaje_responsabilidad_civil_au_au}% del Contrato. Este instrumento deberá ser consignado y aprobado por “EL CONTRATANTE” antes de la firma del Acta de Inicio. El incumplimiento de esta obligación será causal de decaimiento de la adjudicación, sin que ello genere derecho a indemnización alguna para “LA CONTRATISTA”.';

/** Sustituye una marca por su párrafo en línea aparte, o la quita si no aplica. */
function parrafo(html: string, marca: string, texto: string | null): string {
  const re = new RegExp(`\\s*\\{${marca}\\}`, 'g');
  return html.replace(re, texto ? `<br>${texto}` : '');
}

export function expandirBloques(html: string, condiciones: CondicionesBloques): string {
  // Las píldoras de bloque vuelven a su marca, y desde ahí se arma igual.
  const conMarcas = reemplazarPildoras(html, IDS_BLOQUES, (id) => `{${id}}`);
  const conRetencion = conMarcas.replace(
    /,?\s*\{retencion_fiel_cumplimiento_au_au\}/g,
    condiciones.retencionFielCumplimiento ? `, ${RETENCION_FIEL}` : '',
  );

  const retencionFianza = condiciones.retencionFianzaLaboral ? RETENCION_FIANZA : '';
  const conAnticipo = parrafo(
    conRetencion,
    'modelo_anticipo_contrato_au_au',
    condiciones.anticipoContrato ? ANTICIPO : null,
  );
  const conFianza = parrafo(
    conAnticipo,
    'modelo_garantia_laboral_au_au',
    condiciones.requiereGarantiaLaboral ? garantiaLaboral(retencionFianza) : null,
  );
  return parrafo(
    conFianza,
    'modelo_poliza_responsabilidad_civil_au_au',
    condiciones.polizaResponsabilidadCivil ? POLIZA : null,
  );
}
