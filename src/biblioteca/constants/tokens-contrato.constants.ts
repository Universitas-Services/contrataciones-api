/**
 * Catálogo de datos que pueden aparecer entre corchetes dentro del cuerpo de
 * una cláusula.
 *
 * El texto de la cláusula se guarda como TEXTO PLANO. El texto que va entre
 * corchetes es a la vez lo que lee el usuario y la llave para resolver el dato:
 *
 *   "El monto total del presente contrato es la cantidad de
 *    [MONTO CONTRATO EN LETRAS] (Bs. [MONTO CONTRATO EN NUMEROS])."
 *
 * `disponibleDesde` indica en qué momento del proceso existe el dato, y por eso
 * determina cómo se renderiza en cada documento:
 *
 *   EXPEDIENTE   → el dato existe desde la Fase 1 (objeto, plazo, porcentajes).
 *   ADJUDICACION → sólo existe tras adjudicar; en Fase 1 se muestra la etiqueta.
 */

export type OrigenToken = 'EXPEDIENTE' | 'ADJUDICACION';

export interface TokenContrato {
  /** Texto que va entre corchetes, tal como lo ve el usuario. */
  etiqueta: string;
  /** Descripción para el selector del frontend. */
  descripcion: string;
  disponibleDesde: OrigenToken;
  /** De dónde sale el dato, para la documentación del equipo. */
  fuente: string;
}

export const TOKENS_CONTRATO: TokenContrato[] = [
  // ─── Disponibles desde el expediente (Fase 0 y 1) ────────────────────────
  {
    etiqueta: 'OBJETO DEL CONTRATO',
    descripcion: 'Descripción del objeto de la contratación',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_expediente_contratacion.desc_objeto_contratacion_au_au',
  },
  {
    etiqueta: 'CODIGO DEL PROCEDIMIENTO',
    descripcion: 'Nomenclatura del procedimiento de contratación',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_expediente_contratacion.cod_nomenclatura_proceso_au_au',
  },
  {
    etiqueta: 'NOMBRE DEL ENTE CONTRATANTE',
    descripcion: 'Nombre del órgano o ente contratante',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'EntePublico.nombre',
  },
  {
    etiqueta: 'RIF DEL ENTE CONTRATANTE',
    descripcion: 'RIF del órgano o ente contratante',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'EntePublico.rif',
  },
  {
    etiqueta: 'PLAZO DE EJECUCION EN DIAS',
    descripcion: 'Plazo de ejecución del procedimiento, en días',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.plazo_ejecucion_procedimiento_au_au',
  },
  {
    etiqueta: 'LUGAR DE EJECUCION',
    descripcion: 'Lugar y logística de ejecución',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.lugar_logistica_ejecucion_au_au',
  },
  {
    etiqueta: 'PORCENTAJE DE FIEL CUMPLIMIENTO',
    descripcion: 'Porcentaje de la garantía de fiel cumplimiento',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.porcentaje_fiel_cumplimiento_au_au',
  },
  {
    etiqueta: 'PORCENTAJE DE ANTICIPO',
    descripcion: 'Porcentaje de anticipo del contrato',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.porcentaje_anticipo_au_au',
  },
  {
    etiqueta: 'PORCENTAJE DE RESPONSABILIDAD SOCIAL',
    descripcion: 'Porcentaje del Compromiso de Responsabilidad Social',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.porcentaje_responsabilidad_social_au_au',
  },

  // ─── Sólo existen tras la adjudicación (Fase 3 y 4) ──────────────────────
  {
    etiqueta: 'MONTO CONTRATO EN NUMEROS',
    descripcion: 'Monto adjudicado, en cifras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.montoAdjudicadoBs',
  },
  {
    etiqueta: 'MONTO CONTRATO EN LETRAS',
    descripcion: 'Monto adjudicado escrito en palabras (se deriva de la cifra)',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.montoAdjudicadoBs (convertido a letras)',
  },
  {
    etiqueta: 'PARTIDA PRESUPUESTARIA',
    descripcion: 'Partida presupuestaria de gasto imputada',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.partida_presupuest_gasto_au_au',
  },
  {
    etiqueta: 'MONTO CRS EN NUMEROS',
    descripcion: 'Monto del Compromiso de Responsabilidad Social, en cifras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.monto_crs_bs_au_au',
  },
  {
    etiqueta: 'MONTO CRS EN LETRAS',
    descripcion: 'Monto del CRS escrito en palabras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.monto_crs_bs_au_au (convertido a letras)',
  },
  {
    etiqueta: 'FECHA DE ADJUDICACION',
    descripcion: 'Fecha del acto de adjudicación',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.fechaActoAdjudicacion',
  },
  {
    etiqueta: 'NOMBRE DEL CONTRATISTA',
    descripcion: 'Razón social del oferente adjudicado',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.nombre_proveedor_oferente_au_au',
  },
  {
    etiqueta: 'RIF DEL CONTRATISTA',
    descripcion: 'RIF del oferente adjudicado',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.rif_proveedor_oferente_au_au',
  },
  {
    etiqueta: 'REPRESENTANTE LEGAL DEL CONTRATISTA',
    descripcion: 'Nombre del representante legal del contratista',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.nombre_rep_legal_oferente_au_au',
  },
  {
    etiqueta: 'CEDULA DEL REPRESENTANTE LEGAL',
    descripcion: 'Cédula del representante legal del contratista',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.cedula_rep_legal_oferente_au_au',
  },
  {
    etiqueta: 'REGISTRO MERCANTIL DEL CONTRATISTA',
    descripcion: 'Datos de registro mercantil del contratista',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.datos_registro_mercantil_proveedor_oferente_au_au',
  },
];

/**
 * Normaliza el texto de un corchete para compararlo: mayúsculas, sin acentos y
 * con los espacios colapsados. Así `[Monto  Contrato en Letras]` y
 * `[MONTO CONTRATO EN LETRAS]` resuelven al mismo token.
 */
export function normalizarEtiqueta(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Índice de tokens por etiqueta normalizada. */
export const TOKENS_POR_CLAVE = new Map<string, TokenContrato>(
  TOKENS_CONTRATO.map((t) => [normalizarEtiqueta(t.etiqueta), t]),
);
