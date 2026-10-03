import { formatDateToSpanishLong, formatCurrencyVE } from '../../common/utils/date-formatter.util';

function stripHtml(html: string | null | undefined): string {
  if (!html) return '___';
  return (
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || '___'
  );
}

function camelToSnake(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function formatNormativaLegalForDoc(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return 'Decreto de Ley de Contrataciones vigente';
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.join(', ');
      }
    } catch {
      // fallback
    }
  }
  return trimmed;
}

function numOrDash(v: unknown): string {
  if (v === null || v === undefined || v === '') return '___';
  if (
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean' ||
    typeof v === 'bigint'
  ) {
    return String(v);
  }
  return '___';
}

function asDate(v: unknown): Date | string | null | undefined {
  if (v instanceof Date || typeof v === 'string' || v === null || v === undefined) {
    return v;
  }
  return undefined;
}

function asRecord(v: unknown): Record<string, unknown> {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function asMoney(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Mapea expediente + Fase1 JSONB al shape de pliego-condiciones-template.docx
 */
export function mapDatosPliegoCondiciones(expediente: any): Record<string, any> {
  const e = expediente;
  const f = expediente.fasePreparatoria;
  const c = expediente.cronograma;
  const m = expediente.modalidad;

  const items = (expediente.presupuestoItems || []).filter((i: any) => !i.deletedAt);
  const subtotalNum = items.reduce(
    (acc: number, item: any) => acc + Number(item.totalItem || 0),
    0,
  );
  const ivaNum = subtotalNum * 0.16;

  const tipo = m.tipoContratacion;
  const esServicios = tipo === 'SERVICIOS';
  const esObras = tipo === 'OBRAS';
  const esBienes = tipo === 'BIENES';
  const esServiciosOObras = esServicios || esObras;

  const nomEnte = e.ente?.nombre || '___';
  const descObjeto = e.descripcionObjeto || '___';
  const codNomenclatura = e.codigoNomenclatura || '___';
  const ciudadEnte = e.ente?.ciudad || '___';
  const estadoEnte = e.ente?.estado || '___';

  const fechaActoRecep = c.fechaActoRecepcionAperturaSobres
    ? formatDateToSpanishLong(asDate(c.fechaActoRecepcionAperturaSobres))
    : '___';

  // --- Promoción económica ---
  const requiereVan = Boolean(f.requiereVan);
  const indPrefLocal = Boolean(f.indPrefLocal);
  const indBonoSujeto = Boolean(f.indBonoSujeto);
  const activaPromocion = Boolean(
    f.activaPromocionEconomica || requiereVan || indPrefLocal || indBonoSujeto,
  );

  // --- Aspectos: retenciones y póliza (textos de lógica) ---
  const retencionFiel = f.retencionFielCumplimiento
    ? '- Si se constituye mediante Retención: Previa aprobación del Ente, se efectuará una retención del diez por ciento (10%) sobre los pagos o valuaciones que se realicen, cuyo monto total retenido será reintegrado al momento de la recepción definitiva y cumplimiento del objeto contratado.'
    : '';

  const retencionFianzaLaboral = f.retencionFianzaLaboral
    ? '2. Si se constituye mediante Retención: Previa aprobación del Ente, se efectuará una retención del cinco por ciento (5%) sobre los pagos o valuaciones que se realicen, cuyo monto total retenido será reintegrado una vez que el contratista demuestre el pago total de sus obligaciones laborales y presente la Solvencia Laboral vigente emitida por el órgano competente, al cierre de la ejecución.'
    : '';

  const montoRc = f.montoResponsabilidadCivilBs
    ? formatCurrencyVE(Number(f.montoResponsabilidadCivilBs))
    : '___';
  const pctRc =
    f.porcentajeResponsabilidadCivil != null ? String(f.porcentajeResponsabilidadCivil) : '___';

  const polizaTexto = f.polizaResponsabilidadCivil
    ? `- Póliza de Responsabilidad Civil: De conformidad con lo previsto en el artículo 125 del Decreto con Rango, Valor y Fuerza de Ley de Contrataciones Públicas, el participante que resulte beneficiado con la adjudicación se obliga a constituir y mantener vigente durante todo el plazo de ejecución del contrato, una Póliza de Responsabilidad Civil que ampare los daños, pérdidas o perjuicios que pudieren ocasionarse a personas o a la propiedad de terceros, con ocasión de ${descObjeto}.
Dicha cobertura deberá incluir, sin limitarse a, los daños derivados de los trabajos, el uso de maquinaria, las acciones del personal del contratista y, en caso de que aplique a la naturaleza del servicio, la Responsabilidad Civil Profesional por errores u omisiones.
La póliza deberá ser emitida por una empresa de seguros de reconocida solvencia en la República, por un monto no menor a Bs. ${montoRc}, o al ${pctRc}% del Contrato. Este instrumento deberá ser consignado y aprobado por el contratante antes de la firma del Acta de Inicio.`
    : '';

  const monedaTexto = f.monedaDiferente
    ? `Se admite oferta en moneda distinta: ${f.nomMonedaExtranjera || '___'}.`
    : '';
  const idiomaTexto = f.idiomaDiferente
    ? `Se admite documentación en idioma distinto: ${f.nomIdiomaDiferente || '___'}.`
    : '';

  const formaPresentacion = (() => {
    switch (tipo) {
      case 'BIENES':
        return [
          'La oferta deberá incluir una descripción exhaustiva y detallada de las características de los Bienes / insumos ofertados.',
          'Adicionalmente, los participantes deberán acompañar y consignar con la oferta los siguientes documentos:',
          'Catálogos, Folletos y/o Fichas Técnicas descriptivas de cada ítem.',
          'Consignar según Modelo N°17 los siguientes compromisos y certificaciones técnicas:',
          'Compromiso de Tiempo de Entrega.',
          'Certificación de Disponibilidad de Inventario (Stock).',
          'Garantía de los Bienes o Insumos.',
        ].join('\n');
      case 'SERVICIOS':
        return [
          'La oferta deberá incluir una descripción exhaustiva y detallada de las características técnicas del servicio ofertado.',
          'Consignar según Modelo N°17 los siguientes compromisos y certificaciones técnicas:',
          'Compromiso de Tiempo de Ejecución.',
          'Declaración de Disponibilidad de Maquinaria/Equipos.',
          'Tiempo de Respuesta (SLA) ante fallas o emergencias.',
        ].join('\n');
      case 'OBRAS':
        return [
          'La oferta deberá incluir una descripción exhaustiva y detallada de las características técnicas del objeto ofertado.',
          'Adicionalmente, los participantes deberán acompañar y consignar con la oferta los siguientes documentos:',
          'Cronograma de Ejecución (Gantt).',
          'Plan de Trabajo.',
          'Consignar según Modelo N°17 los siguientes compromisos y certificaciones técnicas:',
          'Compromiso de Tiempo de Ejecución (ajustado al Cronograma).',
          'Declaración de Disponibilidad de Maquinaria/Equipos.',
          'Consignar según Modelo N°18 el siguiente compromiso y certificación técnica:',
          'Experiencia del personal técnico clave.',
        ].join('\n');
      default:
        return '___';
    }
  })();

  // --- Calificación legal ---
  const legal = asRecord(f.calificacionLegalData);
  const exigidos = asRecord(legal.exigidos);
  const sustitutos = asRecord(legal.sustitutos);
  const legalFlags: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(exigidos)) {
    legalFlags[camelToSnake(k)] = Boolean(v);
  }
  for (const [k, v] of Object.entries(sustitutos)) {
    legalFlags[camelToSnake(k)] = Boolean(v);
  }

  const personalizados = Array.isArray(legal.personalizados) ? legal.personalizados : [];
  const otrosSobre1 = personalizados
    .filter((p: any) => p.sobre === 1 && p.exigido)
    .map((p: any) => ({ desc_otro_recaudo_sobre1_au_au: p.descripcion || '___' }));
  const otrosSobre2 = personalizados
    .filter((p: any) => p.sobre === 2 && p.exigido)
    .map((p: any) => ({ desc_otro_recaudo_sobre2_au_au: p.descripcion || '___' }));
  const modelosSobre1 = personalizados
    .filter((p: any) => p.sobre === 1 && p.tieneModelo)
    .map((p: any) => ({ modelo_otro_recaudo_sobre1_au_au: p.descripcion || '___' }));
  const modelosSobre2 = personalizados
    .filter((p: any) => p.sobre === 2 && p.tieneModelo)
    .map((p: any) => ({ modelo_otro_recaudo_sobre2_au_au: p.descripcion || '___' }));

  // Also expose top-level mod_* as booleans for {#mod_*} sections
  const modFlags = { ...legalFlags };

  // --- Calificación financiera ---
  const fin = f.calificacionFinancieraData || {};
  const rs = fin.rangosSolvencia || {};
  const rr = fin.rangosRotacion || {};
  const rren = fin.rangosRendimiento || {};
  const rrent = fin.rangosRentabilidad || {};
  const re = fin.rangosEndeudamiento || {};

  // --- Calificación técnica ---
  const tec = f.calificacionTecnicaData || {};
  const criteriosTec = Array.isArray(tec.criterios) ? tec.criterios : [];
  const totalPuntTec = criteriosTec.reduce(
    (a: number, crite: any) => a + Number(crite.puntuacion || 0),
    0,
  );
  const criteriosAntesTec = criteriosTec.map((crite: any) => ({
    criterio_calificacion_tecnica_au_au: crite.nombre || '___',
    puntuacion_criterio_calificacion_tecnica_au_au: numOrDash(crite.puntuacion),
  }));
  const matrizTec = criteriosTec.map((crite: any) => ({
    criterio_calificacion_tecnica_au_au: crite.nombre || '___',
    desc_criterio_calificacion_tecnica_au_au: crite.descripcion || '___',
    criterios_calificacion_tecnica_desde_au_au: (crite.rangos || []).map((r: any) => ({
      rango_criterio_calificacion_tecnica_au_au: r.descripcion || '___',
      puntuacion_rango_criterio_calificacion_tecnica_au_au: numOrDash(r.puntaje),
    })),
  }));

  // --- Evaluación T/E ---
  const evalTe = f.evaluacionTecnicaEconomicaData || {};
  const critEvalTec = Array.isArray(evalTe.tecnica?.criterios) ? evalTe.tecnica.criterios : [];
  const critEvalEco = Array.isArray(evalTe.economica?.criterios) ? evalTe.economica.criterios : [];
  const totalEvalTec = critEvalTec.reduce(
    (a: number, crite: any) => a + Number(crite.puntuacion || 0),
    0,
  );
  const totalEvalEco = critEvalEco.reduce(
    (a: number, crite: any) => a + Number(crite.puntuacion || 0),
    0,
  );

  const criteriosAntesEvalTec = critEvalTec.map((crite: any) => ({
    criterio_evaluacion_tecnica_au_au: crite.nombre || '___',
    puntuacion_criterio_evaluacion_tecnica_au_au: numOrDash(crite.puntuacion),
  }));
  const matrizEvalTec = critEvalTec.map((crite: any) => ({
    criterio_evaluacion_tecnica_au_au: crite.nombre || '___',
    desc_criterio_evaluacion_tecnica_au_au: crite.descripcion || '___',
    criterios_evaluacion_tecnica_desde_au_au: (crite.rangos || []).map((r: any) => ({
      rango_criterio_evaluacion_tecnica_au_au: r.descripcion || '___',
      puntuacion_rango_criterio_evaluacion_tecnica_au_au: numOrDash(r.puntaje),
    })),
  }));

  const criteriosAntesEvalEco = critEvalEco.map((crite: any) => ({
    criterio_evaluacion_economico_au_au: crite.nombre || '___',
    puntuacion_criterio_evaluacion_economico_au_au: numOrDash(crite.puntuacion),
  }));
  const matrizEvalEco = critEvalEco.map((crite: any) => ({
    criterio_evaluacion_economico_au_au: crite.nombre || '___',
    desc_criterio_evaluacion_economica_au_au: crite.descripcion || '___',
    criterios_evaluacion_economico_desde_au_au: (crite.rangos || []).map((r: any) => ({
      rango_criterio_evaluacion_economico_au_au: r.descripcion || '___',
      puntuacion_rango_criterio_evaluacion_economico_au_au: numOrDash(r.puntaje),
    })),
  }));

  // --- Cláusulas ---
  const modelo = asRecord(f.modeloContratoData);
  const clauses = Array.isArray(modelo.clauses) ? modelo.clauses : [];
  const clausulasCustom = clauses.map((clRaw: unknown, idx: number) => {
    const cl = asRecord(clRaw);
    const cuerpoHtml = typeof cl.cuerpoHtml === 'string' ? cl.cuerpoHtml : undefined;
    return {
      num_clausula_custom_au_au: numOrDash(cl.order ?? idx + 1),
      titulo_clausula_custom_au_au: typeof cl.titulo === 'string' ? cl.titulo : '___',
      cuerpo_clausula_custom_au_au: stripHtml(cuerpoHtml),
    };
  });

  const normativaRaw = f.normativaLegal;
  const normativaLegal = formatNormativaLegalForDoc(
    typeof normativaRaw === 'string' ? normativaRaw : undefined,
  );

  const requiereGarantiaLaboral = Boolean(f.requiereGarantiaLaboral);

  return {
    // Generales
    nom_ente_contratante: nomEnte,
    desc_objeto_contratacion_au_au: descObjeto,
    cod_nomenclatura_proceso_au_au: codNomenclatura,
    // alias legacy
    desc_objeto_contratacion: descObjeto,
    cod_nomenclatura_proceso: codNomenclatura,
    normativa_legal_au_au: normativaLegal,
    normativa_general: normativaLegal,
    valor_ucau_base: formatCurrencyVE(Number(m.valorUcauBase)),
    denominacion_comision:
      e.comision?.denominacionComision || 'Comisión de Contrataciones Públicas',
    dir_fiscal_ente: e.ente?.direccionFiscal || '___',
    loc_estado_ente: estadoEnte,
    correo_comision: e.comision?.correoElectronico || '___',
    telefono_comision: e.comision?.telefono || '___',
    pag_web_ente: 'www.snd.gob.ve',
    loc_municipio_ente: e.ente?.municipio || '___',
    loc_ciudad_ente: ciudadEnte,
    monto_estimado_bs: formatCurrencyVE(Number(m.montoEstimadoBs)),

    nom_completo_autoridad: e.autoridad?.nombreCompletoAutoridad || '___',
    cedula_autoridad: e.autoridad?.cedulaAutoridad || '___',
    cargo_oficial_autoridad: e.autoridad?.cargoOficialAutoridad || '___',
    datos_designacion_autoridad: e.autoridad?.datosDesignacionAutoridad || '___',

    autoridad_aclaratorias_au_au: f.autoridadAclaratorias || '___',
    dias_vigencia_garantia_ext_au_au: f.diasVigenciaGarantiaExtension?.toString() || '___',
    dias_validez_oferta_au_au: f.diasValidezOferta?.toString() || '30',

    fec_acto_recep_aper_sobres_au_au: fechaActoRecep,
    hora_acto_recep_aper_au_au: f.horaActoRecepAper || '___',
    fec_solicitud_aclaratorias_au_au: c.fechaSolicitudAclaratorias
      ? formatDateToSpanishLong(asDate(c.fechaSolicitudAclaratorias))
      : '___',
    fec_respuesta_aclaratorias_au_au: c.fechaRespuestaAclaratorias
      ? formatDateToSpanishLong(asDate(c.fechaRespuestaAclaratorias))
      : '___',
    fec_modific_pliego_au_au: c.fechaModificacionPliego
      ? formatDateToSpanishLong(asDate(c.fechaModificacionPliego))
      : '___',
    fec_inicio_disponibilidad_pliego_au_au: c.fechaInicioDisponibilidadPliego
      ? formatDateToSpanishLong(asDate(c.fechaInicioDisponibilidadPliego))
      : '___',
    fec_fin_disponibilidad_pliego_au_au: c.fechaFinDisponibilidadPliego
      ? formatDateToSpanishLong(asDate(c.fechaFinDisponibilidadPliego))
      : '___',
    fec_limite_evaluacion_au_au: c.fechaLimiteEvaluacion
      ? formatDateToSpanishLong(asDate(c.fechaLimiteEvaluacion))
      : '___',
    fec_limite_adjudicacion_au_au: c.fechaLimiteAdjudicacion
      ? formatDateToSpanishLong(asDate(c.fechaLimiteAdjudicacion))
      : '___',
    fec_limite_notificacion_au_au: c.fechaLimiteNotificacion
      ? formatDateToSpanishLong(asDate(c.fechaLimiteNotificacion))
      : '___',
    fec_limite_garantias_au_au: c.fechaLimiteGarantias
      ? formatDateToSpanishLong(asDate(c.fechaLimiteGarantias))
      : '___',
    fec_limite_firma_contrato_au_au: c.fechaLimiteFirmaContrato
      ? formatDateToSpanishLong(asDate(c.fechaLimiteFirmaContrato))
      : '___',

    horario_retiro_pliego: f.horarioRetiroPliego || '___',
    direccion_retiro_pliego: f.direccionRetiroPliego || '___',
    forma_presentacion_au_au: formaPresentacion,
    tipo_objeto_contratacion: esBienes ? 'Bienes' : esServicios ? 'Servicios' : 'Obras',

    // Aspectos / garantías
    moneda_diferente_au_au: monedaTexto,
    idioma_diferente_au_au: idiomaTexto,
    porcentaje_responsabilidad_social_au_au:
      f.porcentajeResponsabilidadSocial != null ? String(f.porcentajeResponsabilidadSocial) : '___',
    forma_responsabilidad_social_au_au: f.formaCumplimientoCrs || '___',
    unidad_resp_cumplimiento_crs_au_au: f.unidadRespCumplimientoCrs || '___',
    modalidad_crs_au_au: f.modalidadCrs || '___',
    forma_cumplimiento_crs_au_au: f.formaCumplimientoCrs || '___',
    porcentaje_fiel_cumplimiento_au_au:
      f.porcentajeFielCumplimiento != null ? String(f.porcentajeFielCumplimiento) : '___',
    porcentaje_garantia_laboral_au_au:
      f.porcentajeGarantiaLaboral != null ? String(f.porcentajeGarantiaLaboral) : '___',
    retencion_fiel_cumplimiento_au_au: retencionFiel,
    retencion_fianza_laboral_au_au: retencionFianzaLaboral,
    poliza_responsabilidad_civil_au_au: polizaTexto,
    monto_responsabilidad_civil_bs_au_au: montoRc,
    porcentaje_responsabilidad_civil_au_au: pctRc,
    requiere_garantia_laboral_au_au: requiereGarantiaLaboral,
    anticipo_contrato_au_au: Boolean(f.anticipoContrato),
    porcentaje_anticipo_au_au: f.porcentajeAnticipo != null ? String(f.porcentajeAnticipo) : '___',
    anticipo_especial_au_au: Boolean(f.anticipoEspecial),
    porcentaje_anticipo_especial_au_au:
      f.porcentajeAnticipoEspecial != null ? String(f.porcentajeAnticipoEspecial) : '___',

    // Promoción
    activa_promocion_economica_au_au: activaPromocion,
    requiere_van_au_au: requiereVan,
    ind_pref_local_au_au: indPrefLocal,
    ind_bono_sujeto_au_au: indBonoSujeto,
    puntaje_van_au_au: numOrDash(f.puntajeVan),
    puntuacion_bono_local_au_au: numOrDash(f.puntuacionBonoLocal),
    puntuacion_bono_sujeto_au_au: numOrDash(f.puntuacionBonoSujeto),

    // Legal flags (boolean sections)
    ...modFlags,
    desc_otro_recaudo_sobre1_au_au: otrosSobre1,
    desc_otro_recaudo_sobre2_au_au: otrosSobre2,
    modelo_otro_recaudo_sobre1_au_au: modelosSobre1,
    modelo_otro_recaudo_sobre2_au_au: modelosSobre2,

    // Alias explícitos frecuentes
    mod_certificado_rnc_au_au: Boolean(exigidos.modCertificadoRncAuAu),
    mod_copia_rif_vigente_au_au: Boolean(exigidos.modCopiaRifVigenteAuAu),
    mod_evaluacion_desempeno_au_au: Boolean(exigidos.modEvaluacionDesempenoAuAu),
    sustituto_dj_rif_vigente_au_au: Boolean(sustitutos.sustitutoDjRifVigenteAuAu),
    sustituto_dj_certificado_rnc_au_au: Boolean(sustitutos.sustitutoDjCertificadoRncAuAu),
    sustituto_dj_eval_desempeno_au_au: Boolean(sustitutos.sustitutoDjEvalDesempenoAuAu),

    // Financiera
    criterio_calif__finan_descapital_au_au: Boolean(fin.criterioCalifFinanDescapital),
    puntaje_maximo_descapital_au_au: numOrDash(fin.puntajeMaximoDescapital),
    criterio_calif__finan_solvencia_au_au: Boolean(fin.criterioCalifFinanSolvencia),
    rango_maximo_criterio_solvencia_au_au: numOrDash(rs.rangoMaximo),
    puntaje_maximo_solvencia_au_au: numOrDash(rs.puntajeMaximo),
    rango_medio_1_criterio_solvencia_au_au: numOrDash(rs.rangoMedioDesde),
    rango_medio_2_criterio_solvencia_au_au: numOrDash(rs.rangoMedioHasta),
    puntaje_medio_solvencia_au_au: numOrDash(rs.puntajeMedio),
    rango_minimo_criterio_solvencia_au_au: numOrDash(rs.rangoMinimo),
    puntaje_minimo_solvencia_au_au: numOrDash(rs.puntajeMinimo),
    criterio_calif__finan_rotacion_au_au: Boolean(fin.criterioCalifFinanRotacion),
    rango_maximo_criterio_rotacion_au_au: numOrDash(rr.rangoMaximo),
    puntaje_maximo_rotacion_au_au: numOrDash(rr.puntajeMaximo),
    rango_medio_1_criterio_rotacion_au_au: numOrDash(rr.rangoMedioDesde),
    rango_medio_2_criterio_rotacion_au_au: numOrDash(rr.rangoMedioHasta),
    puntaje_medio_rotacion_au_au: numOrDash(rr.puntajeMedio),
    rango_minimo_criterio_rotacion_au_au: numOrDash(rr.rangoMinimo),
    puntaje_minimo_rotacion_au_au: numOrDash(rr.puntajeMinimo),
    criterio_calif__finan_rendimiento_au_au: Boolean(fin.criterioCalifFinanRendimiento),
    rango_maximo_criterio_rendimiento_au_au: numOrDash(rren.rangoMaximo),
    puntaje_maximo_rendimiento_au_au: numOrDash(rren.puntajeMaximo),
    rango_medio_criterio_1_rendimiento_au_au: numOrDash(rren.rangoMedioDesde),
    rango_medio_criterio_2_rendimiento_au_au: numOrDash(rren.rangoMedioHasta),
    puntaje_medio_rendimiento_au_au: numOrDash(rren.puntajeMedio),
    rango_minimo_criterio_rendimiento_au_au: numOrDash(rren.rangoMinimo),
    puntaje_minimo_rendimiento_au_au: numOrDash(rren.puntajeMinimo),
    criterio_calif__finan_rentabilidad_au_au: Boolean(fin.criterioCalifFinanRentabilidad),
    rango_maximo_criterio_rentabilidad_au_au: numOrDash(rrent.rangoMaximo),
    puntaje_maximo_rentabilidad_au_au: numOrDash(rrent.puntajeMaximo),
    rango_medio_1_criterio_rentabilidad_au_au: numOrDash(rrent.rangoMedioDesde),
    rango_medio_2_criterio_rentabilidad_au_au: numOrDash(rrent.rangoMedioHasta),
    puntaje_medio_rentabilidad_au_au: numOrDash(rrent.puntajeMedio),
    rango_minimo_criterio_rentabilidad_au_au: numOrDash(rrent.rangoMinimo),
    puntaje_minimo_rentabilidad_au_au: numOrDash(rrent.puntajeMinimo),
    criterio_calif__finan_endeudamiento_au_au: Boolean(fin.criterioCalifFinanEndeudamiento),
    rango_maximo_criterio_endeudamiento_au_au: numOrDash(re.rangoMaximo),
    puntaje_maximo_endeudamiento_au_au: numOrDash(re.puntajeMaximo),
    rango_medio_1_criterio_endeudamiento_au_au: numOrDash(re.rangoMedioDesde),
    rango_medio_2_criterio_endeudamiento_au_au: numOrDash(re.rangoMedioHasta),
    puntaje_medio_endeudamiento_au_au: numOrDash(re.puntajeMedio),
    rango_minimo_criterio_endeudamiento_au_au: numOrDash(re.rangoMinimo),
    puntaje_minimo_endeudamiento_au_au: numOrDash(re.puntajeMinimo),
    puntuacion_minima_calif_financiera_au_au: numOrDash(fin.puntuacionMinimaCalifFinanciera),

    // Técnica
    criterios_calificacion_tecnica_antes_au_au: criteriosAntesTec,
    matriz_criterio_calificacion_tecnica_au_au: matrizTec,
    total_puntuacion_criterio_calificacion_tecnica_au_au: numOrDash(totalPuntTec),
    puntuacion_minima_calif_tecnica_au_au: numOrDash(tec.puntuacionMinimaCalifTecnica),

    // Evaluación
    criterios_evaluacion_tecnica_antes_au_au: criteriosAntesEvalTec,
    matriz_criterio_evaluacion_tecnica_au_au: matrizEvalTec,
    total_puntuacion_criterio_evaluacion_tecnica_au_au: numOrDash(totalEvalTec),
    puntuacion_minima_evaluacion_tecnica: numOrDash(evalTe.tecnica?.puntuacionMinima),
    criterios_evaluacion_economico_antes_au_au: criteriosAntesEvalEco,
    matriz_criterio_evaluacion_economico_au_au: matrizEvalEco,
    total_puntuacion_criterio_evaluacion_economico_au_au: numOrDash(totalEvalEco),
    total_puntuacion_criterio_evaluacion_economica_au_au: numOrDash(totalEvalEco),
    total_puntuacion_matriz_evaluacion_au_au: numOrDash(totalEvalTec + totalEvalEco),
    total_puntuacion_evaluacion_adicional_au_au: numOrDash(
      Number(f.puntajeVan || 0) +
        Number(f.puntuacionBonoLocal || 0) +
        Number(f.puntuacionBonoSujeto || 0),
    ),

    // Cláusulas
    clausulas_custom_au_au: clausulasCustom,

    // Presupuesto (loop {#} parcheado a items_presupuesto)
    items_presupuesto: items.map((item: any, index: number) => ({
      numero: index + 1,
      descripcion_item_au_au: item.descripcionItem,
      codigo_partida_au_au: item.codigoPartida,
      unidad_medida_au_au: item.unidadMedida,
      cantidad_requerida_au_au: formatCurrencyVE(asMoney(item.cantidadRequerida)),
      precio_unitario_estimado_au_au: formatCurrencyVE(asMoney(item.precioUnitarioEstimado)),
      total_items_au_au: formatCurrencyVE(asMoney(item.totalItem)),
    })),
    sub_total: formatCurrencyVE(asMoney(subtotalNum)),
    iva_sub_total: formatCurrencyVE(asMoney(ivaNum)),
    monto_total_renglon_au_au: formatCurrencyVE(asMoney(subtotalNum + ivaNum)),
    tasa_referencial_bcv: e.tasaReferencialBcv ? asMoney(e.tasaReferencialBcv).toFixed(4) : '___',

    // Legacy booleans kept for older template sections if any remain
    es_bienes: esBienes,
    es_servicios: esServicios,
    es_obras: esObras,
    es_bienes_criterio_evaluacion_au_au: esBienes,
    es_servicios_criterio_evaluacion_au_au: esServicios,
    es_obras_criterio_evaluacion_au_au: esObras,
    requiere_responsabilidad_civil_au_au:
      Boolean(f.polizaResponsabilidadCivil) || esServiciosOObras,
  };
}
