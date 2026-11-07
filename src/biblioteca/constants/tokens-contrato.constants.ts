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

export type OrigenToken = 'EXPEDIENTE' | 'ADJUDICACION' | 'CONTRATO';

export interface TokenContrato {
  /**
   * Identificador estable del dato. Es lo único que viaja en el HTML del
   * editor (`data-token-id`) y lo único que el backend usa para resolverlo:
   * la etiqueta puede cambiar de redacción sin romper las cláusulas ya
   * guardadas.
   */
  id: string;
  /** Texto que va entre corchetes, tal como lo ve el usuario. */
  etiqueta: string;
  /** Descripción para el selector del frontend. */
  descripcion: string;
  disponibleDesde: OrigenToken;
  /** De dónde sale el dato, para la documentación del equipo. */
  fuente: string;
  /**
   * Otras redacciones del mismo dato que aparecen en cláusulas ya escritas.
   * Resuelven al mismo token, de modo que un texto viejo no se quede con el
   * corchete crudo por una palabra de diferencia.
   */
  alias?: string[];
}

export const TOKENS_CONTRATO: TokenContrato[] = [
  // ─── Disponibles desde el expediente (Fase 0 y 1) ────────────────────────
  {
    id: 'objeto_contratacion_au_au',
    etiqueta: 'OBJETO DEL CONTRATO',
    descripcion: 'Descripción del objeto de la contratación',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_expediente_contratacion.desc_objeto_contratacion_au_au',
  },
  {
    id: 'nomenclatura_proceso_au_au',
    etiqueta: 'CODIGO DEL PROCEDIMIENTO',
    descripcion: 'Nomenclatura del procedimiento de contratación',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_expediente_contratacion.cod_nomenclatura_proceso_au_au',
  },
  {
    id: 'nombre_ente_contratante_au_au',
    etiqueta: 'NOMBRE DEL ENTE CONTRATANTE',
    descripcion: 'Nombre del órgano o ente contratante',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'EntePublico.nombre',
  },
  {
    id: 'rif_ente_au_au',
    etiqueta: 'RIF DEL ENTE CONTRATANTE',
    descripcion: 'RIF del órgano o ente contratante',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'EntePublico.rif',
  },
  {
    id: 'plazo_ejecucion_dias_au_au',
    etiqueta: 'PLAZO DE EJECUCION EN DIAS',
    alias: ['PLAZO EJECUCION DIAS'],
    descripcion: 'Plazo de ejecución del procedimiento, en días',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.plazo_ejecucion_procedimiento_au_au',
  },
  {
    id: 'lugar_ejecucion_au_au',
    etiqueta: 'LUGAR DE EJECUCION',
    descripcion: 'Lugar y logística de ejecución',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.lugar_logistica_ejecucion_au_au',
  },
  {
    id: 'porcentaje_fiel_cumplimiento_au_au',
    etiqueta: 'PORCENTAJE DE FIEL CUMPLIMIENTO',
    descripcion: 'Porcentaje de la garantía de fiel cumplimiento',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.porcentaje_fiel_cumplimiento_au_au',
  },
  {
    id: 'porcentaje_anticipo_au_au',
    etiqueta: 'PORCENTAJE DE ANTICIPO',
    descripcion: 'Porcentaje de anticipo del contrato',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.porcentaje_anticipo_au_au',
  },
  {
    id: 'porcentaje_responsabilidad_social_au_au',
    etiqueta: 'PORCENTAJE DE RESPONSABILIDAD SOCIAL',
    descripcion: 'Porcentaje del Compromiso de Responsabilidad Social',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.porcentaje_responsabilidad_social_au_au',
  },

  // ─── Sólo existen tras la adjudicación (Fase 3 y 4) ──────────────────────
  {
    id: 'monto_contrato_numeros_au_au',
    etiqueta: 'MONTO CONTRATO EN NUMEROS',
    descripcion: 'Monto adjudicado, en cifras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.montoAdjudicadoBs',
  },
  {
    id: 'monto_contrato_letras_au_au',
    etiqueta: 'MONTO CONTRATO EN LETRAS',
    descripcion: 'Monto adjudicado escrito en palabras (se deriva de la cifra)',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.montoAdjudicadoBs (convertido a letras)',
  },
  {
    id: 'partidas_presupuestarias_au_au',
    etiqueta: 'PARTIDA PRESUPUESTARIA',
    alias: ['PARTIDAS PRESUPUESTARIAS'],
    descripcion: 'Partida presupuestaria de gasto imputada',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.partida_presupuest_gasto_au_au',
  },
  {
    id: 'monto_crs_numeros_au_au',
    etiqueta: 'MONTO CRS EN NUMEROS',
    descripcion: 'Monto del Compromiso de Responsabilidad Social, en cifras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.monto_crs_bs_au_au',
  },
  {
    id: 'monto_crs_letras_au_au',
    etiqueta: 'MONTO CRS EN LETRAS',
    descripcion: 'Monto del CRS escrito en palabras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.monto_crs_bs_au_au (convertido a letras)',
  },
  {
    id: 'fecha_adjudicacion_au_au',
    etiqueta: 'FECHA DE ADJUDICACION',
    descripcion: 'Fecha del acto de adjudicación',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_adjudicacion.fechaActoAdjudicacion',
  },
  {
    id: 'nombre_contratista_au_au',
    etiqueta: 'NOMBRE DEL CONTRATISTA',
    descripcion: 'Razón social del oferente adjudicado',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.nombre_proveedor_oferente_au_au',
  },
  {
    id: 'rif_contratista_au_au',
    etiqueta: 'RIF DEL CONTRATISTA',
    descripcion: 'RIF del oferente adjudicado',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.rif_proveedor_oferente_au_au',
  },
  {
    id: 'representante_contratista_au_au',
    etiqueta: 'REPRESENTANTE LEGAL DEL CONTRATISTA',
    descripcion: 'Nombre del representante legal del contratista',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.nombre_rep_legal_oferente_au_au',
  },
  {
    id: 'cedula_representante_au_au',
    etiqueta: 'CEDULA DEL REPRESENTANTE LEGAL',
    descripcion: 'Cédula del representante legal del contratista',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.cedula_rep_legal_oferente_au_au',
  },
  {
    id: 'registro_mercantil_au_au',
    etiqueta: 'REGISTRO MERCANTIL DEL CONTRATISTA',
    descripcion: 'Datos de registro mercantil del contratista',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'tb_oferta_presentada.datos_registro_mercantil_proveedor_oferente_au_au',
  },
  {
    id: 'organo_adscripcion_au_au',
    etiqueta: 'ORGANO DE ADSCRIPCION',
    descripcion: 'Órgano de adscripción del ente contratante',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'EntePublico.organoAdscripcion',
  },
  // ─── Datos del contrato (cláusulas de la biblioteca) ─────────────────────
  //
  // Los llenaba el formulario de `ContratoFormalizado`, que este flujo no usa.
  // Los que tienen fuente se resuelven solos; el resto queda como píldora sin
  // resolver para que quien arma el contrato escriba el dato.
  {
    id: 'monto_garantia_fiel_cumplimiento_numeros_au_au',
    etiqueta: 'MONTO GARANTIA FIEL CUMPLIMIENTO NUMEROS',
    descripcion: 'Monto de la fianza de fiel cumplimiento, en cifras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'monto del contrato × 0,16 × porcentaje_fiel_cumplimiento_au_au',
  },
  {
    id: 'monto_garantia_fiel_cumplimiento_letras_au_au',
    etiqueta: 'MONTO GARANTIA FIEL CUMPLIMIENTO LETRAS',
    descripcion: 'Monto de la fianza de fiel cumplimiento, en letras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'monto del contrato × 0,16 × porcentaje_fiel_cumplimiento_au_au',
  },
  {
    id: 'ciudad_domicilio_especial_au_au',
    etiqueta: 'CIUDAD DOMICILIO ESPECIAL',
    descripcion: 'Ciudad que las partes eligen como domicilio especial',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'EntePublico.ciudad',
  },
  {
    id: 'fecha_inicio_vigencia_au_au',
    etiqueta: 'FECHA INICIO VIGENCIA',
    descripcion: 'Fecha en que empieza a regir el contrato',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'fecha_fin_vigencia_au_au',
    etiqueta: 'FECHA FIN VIGENCIA',
    descripcion: 'Fecha en que termina la vigencia del contrato',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'evento_inicio_plazo_au_au',
    etiqueta: 'EVENTO INICIO PLAZO',
    descripcion: 'Hecho desde el cual se cuenta el plazo (acta de inicio, orden de compra…)',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'porcentaje_multa_diaria_au_au',
    etiqueta: 'PORCENTAJE MULTA DIARIA',
    descripcion: 'Porcentaje de la multa por cada día de retraso',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'base_calculo_multa_au_au',
    etiqueta: 'BASE CALCULO MULTA',
    descripcion: 'Monto sobre el cual se calcula la multa diaria',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'plazo_subsanacion_incumplimiento_au_au',
    etiqueta: 'PLAZO SUBSANACION INCUMPLIMIENTO',
    descripcion: 'Plazo para regularizar un incumplimiento',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'limitacion_porcentaje_rescision_au_au',
    etiqueta: 'LIMITACION PORCENTAJE RESCISION',
    descripcion: 'Porcentaje a partir del cual procede la rescisión',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'formula_escalatoria_au_au',
    etiqueta: 'FORMULA ESCALATORIA O METODOLOGIA',
    descripcion: 'Fórmula de ajuste de precios acordada',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'factores_evaluacion_cuantitativos_au_au',
    etiqueta: 'FACTORES EVALUACION CUANTITATIVOS',
    descripcion: 'Factores con que se evalúa el desempeño de la contratista',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'lapso_minimo_garantia_post_au_au',
    etiqueta: 'LAPSO MINIMO GARANTIA POST',
    descripcion: 'Lapso mínimo de garantía después de ejecutado el contrato',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'plazo_consignacion_factura_au_au',
    etiqueta: 'PLAZO CONSIGNACION FACTURA',
    descripcion: 'Plazo para consignar las facturas',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'plazo_calendario_desembolso_au_au',
    etiqueta: 'PLAZO CALENDARIO DESEMBOLSO',
    descripcion: 'Plazo del calendario de desembolsos',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'criterios_aceptacion_soporte_au_au',
    etiqueta: 'CRITERIOS DE ACEPTACION SOPORTE',
    descripcion: 'Criterios con que se acepta el soporte prestado',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },
  {
    id: 'tipo_soporte_ejecucion_au_au',
    etiqueta: 'TIPO SOPORTE EJECUCION',
    descripcion: 'Tipo de soporte que acompaña la ejecución',
    disponibleDesde: 'CONTRATO',
    fuente: 'Lo escribe quien arma el contrato',
  },

  // Datos que usan las cláusulas de Fase 1 y los bloques de la tarjeta de garantías.
  {
    id: 'nom_unidad_usuaria_au_au',
    etiqueta: 'UNIDAD USUARIA',
    descripcion: 'Unidad usuaria del expediente',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'UnidadUsuaria.nombreUnidadUsuaria',
  },
  {
    id: 'modalidad_crs_au_au',
    etiqueta: 'MODALIDAD CRS',
    descripcion: 'Modalidad del compromiso de responsabilidad social',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.modalidad_crs_au_au',
  },
  {
    id: 'unidad_resp_cumplimiento_crs_au_au',
    etiqueta: 'UNIDAD RESPONSABLE CRS',
    descripcion: 'Unidad responsable del seguimiento del CRS',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.unidad_resp_cumplimiento_crs_au_au',
  },
  {
    id: 'porcentaje_garantia_laboral_au_au',
    etiqueta: 'PORCENTAJE DE GARANTIA LABORAL',
    descripcion: 'Porcentaje de la fianza laboral',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.porcentaje_garantia_laboral_au_au',
  },
  {
    id: 'porcentaje_responsabilidad_civil_au_au',
    etiqueta: 'PORCENTAJE DE RESPONSABILIDAD CIVIL',
    descripcion: 'Porcentaje de la póliza de responsabilidad civil',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.porcentaje_responsabilidad_civil_au_au',
  },
  {
    id: 'monto_responsabilidad_civil_bs_au_au',
    etiqueta: 'MONTO RESPONSABILIDAD CIVIL NUMEROS',
    descripcion: 'Monto de la póliza de responsabilidad civil, en cifras',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.monto_responsabilidad_civil_bs_au_au',
  },
  {
    id: 'monto_responsabilidad_civil_letras_au_au',
    etiqueta: 'MONTO RESPONSABILIDAD CIVIL LETRAS',
    descripcion: 'Monto de la póliza de responsabilidad civil, en letras',
    disponibleDesde: 'EXPEDIENTE',
    fuente: 'tb_fase_preparatoria.monto_responsabilidad_civil_bs_au_au',
  },
  {
    id: 'monto_fianza_laboral_numeros_au_au',
    etiqueta: 'MONTO FIANZA LABORAL NUMEROS',
    descripcion: 'Monto de la fianza laboral, en cifras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'mano de obra ofertada × porcentaje_garantia_laboral_au_au',
  },
  {
    id: 'monto_fianza_laboral_letras_au_au',
    etiqueta: 'MONTO FIANZA LABORAL LETRAS',
    descripcion: 'Monto de la fianza laboral, en letras',
    disponibleDesde: 'ADJUDICACION',
    fuente: 'mano de obra ofertada × porcentaje_garantia_laboral_au_au',
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

/**
 * Índice por etiqueta normalizada, incluidos los alias. Es lo que permite que
 * una cláusula escrita con otra redacción siga resolviendo al mismo dato.
 */
export const TOKENS_POR_CLAVE = new Map<string, TokenContrato>(
  TOKENS_CONTRATO.flatMap((t) =>
    [t.etiqueta, ...(t.alias ?? [])].map(
      (texto) => [normalizarEtiqueta(texto), t] as [string, TokenContrato],
    ),
  ),
);

/**
 * Índice de tokens por id. Es el que usa el parser de píldoras del contrato,
 * que localiza cada variable por `data-token-id` y nunca por su texto.
 */
export const TOKENS_POR_ID = new Map<string, TokenContrato>(TOKENS_CONTRATO.map((t) => [t.id, t]));
