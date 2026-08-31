import { MicromoduloKey } from '../constants/micromodulos.constants';
import { RECAUDOS_SOBRE_1, RECAUDOS_SOBRE_2 } from '../constants/recaudos-legales.constants';

/** Contexto del expediente que algunas validaciones necesitan. */
export interface ContextoValidacion {
  tipoContratacion: string;
  /** Cantidad de ítems de presupuesto vigentes. */
  totalItemsPresupuesto: number;
}

type Datos = Record<string, any>;

const vacio = (v: any) => v === null || v === undefined || (typeof v === 'string' && !v.trim());
const sinResponder = (v: any) => v === null || v === undefined;

function requerir(errores: string[], datos: Datos, campo: string, etiqueta: string) {
  if (vacio(datos[campo])) errores.push(`${etiqueta} es obligatorio.`);
}

function requerirBooleano(errores: string[], datos: Datos, campo: string, etiqueta: string) {
  if (sinResponder(datos[campo])) errores.push(`Debe responder: ${etiqueta}.`);
}

function requerirEnRango(
  errores: string[],
  datos: Datos,
  campo: string,
  etiqueta: string,
  min: number,
  max: number,
) {
  const valor = Number(datos[campo]);
  if (vacio(datos[campo]) || Number.isNaN(valor)) {
    errores.push(`${etiqueta} es obligatorio.`);
    return;
  }
  if (valor < min || valor > max) {
    errores.push(`${etiqueta} debe estar entre ${min} y ${max}.`);
  }
}

// ---------------------------------------------------------------------------
// Actividades Previas
// ---------------------------------------------------------------------------
function validarActividadesPrevias(datos: Datos, ctx: ContextoValidacion): string[] {
  const e: string[] = [];

  requerir(e, datos, 'numReferenciaSnc', 'El número de referencia SNC');
  requerirBooleano(e, datos, 'modifRequerimientoSnc', '¿Hubo modificación del requerimiento SNC?');
  if (datos.modifRequerimientoSnc === true) {
    requerir(e, datos, 'numeroModifRequerimientoSnc', 'El número de la modificación SNC');
  }

  requerir(e, datos, 'justificacionNecesidadContratacion', 'La justificación de la necesidad');
  requerir(e, datos, 'justificacionVentajas', 'La justificación de las ventajas');
  requerirBooleano(e, datos, 'condicionPlurianual', '¿Aplica condición plurianual?');

  // El proyecto aprobado solo se exige en contrataciones de OBRAS.
  if (ctx.tipoContratacion === 'OBRAS') {
    requerirBooleano(e, datos, 'proyectoAprobado', '¿El proyecto está aprobado?');
  }

  requerirBooleano(e, datos, 'permitePymesCooperativas', '¿Permite PyMES y cooperativas?');
  if (datos.permitePymesCooperativas === false) {
    requerir(
      e,
      datos,
      'justificacionPermitePymesCooperativas',
      'La justificación de exclusión de PyMES',
    );
  }

  requerirBooleano(e, datos, 'viabilidadContratoMarco', '¿Es viable el contrato marco?');
  if (datos.viabilidadContratoMarco === true) {
    requerir(e, datos, 'justificacion_contrato_marco_au_au', 'La justificación del contrato marco');
  }

  requerir(e, datos, 'fecEstudioMercado', 'La fecha del estudio de mercado');
  requerir(e, datos, 'numCertificacionPresupuestaria', 'El número de certificación presupuestaria');

  const plazo = Number(datos.plazoEjecucionProcedimiento);
  if (vacio(datos.plazoEjecucionProcedimiento) || Number.isNaN(plazo) || plazo <= 0) {
    e.push('El plazo de ejecución debe ser un número mayor a 0.');
  }

  requerir(e, datos, 'lugarLogisticaEjecucion', 'El lugar y logística de ejecución');

  requerirBooleano(e, datos, 'requiereEspecializado', '¿Requiere personal especializado?');
  if (datos.requiereEspecializado === true) {
    requerir(e, datos, 'detalleEspecializado', 'El detalle del requerimiento especializado');
  }

  requerirBooleano(e, datos, 'requiereMuestras', '¿Requiere muestras?');
  if (datos.requiereMuestras === true) {
    requerir(e, datos, 'detalleProcedimientoMuestras', 'El detalle del procedimiento de muestras');
  }

  requerirBooleano(e, datos, 'activaPromocionEconomica', '¿Activa la promoción económica?');
  if (datos.activaPromocionEconomica === true) {
    requerirBooleano(e, datos, 'requiereVan', '¿Requiere VAN?');
    if (datos.requiereVan === true) {
      requerirEnRango(e, datos, 'puntajeVan', 'El puntaje VAN', 1, 10);
    }

    requerirBooleano(e, datos, 'indPrefLocal', '¿Aplica preferencia local?');
    if (datos.indPrefLocal === true && Number(datos.puntuacionBonoLocal) <= 0) {
      e.push('La puntuación del bono local debe ser mayor a 0.');
    }

    requerirBooleano(e, datos, 'indBonoSujeto', '¿Aplica bono por sujeto?');
    if (datos.indBonoSujeto === true && Number(datos.puntuacionBonoSujeto) <= 0) {
      e.push('La puntuación del bono por sujeto debe ser mayor a 0.');
    }
  }

  return e;
}

// ---------------------------------------------------------------------------
// Llamado
// ---------------------------------------------------------------------------
function validarLlamado(datos: Datos): string[] {
  const e: string[] = [];

  requerir(e, datos, 'objetivosEspecificos1', 'El primer objetivo específico');
  requerir(e, datos, 'direccionRetiroPliego', 'La dirección de retiro del pliego');
  requerir(e, datos, 'horarioRetiroPliego', 'El horario de retiro del pliego');
  requerir(e, datos, 'horaActoRecepAper', 'La hora del acto de recepción y apertura');

  requerirBooleano(e, datos, 'pliegoGratuito', '¿El pliego es gratuito?');

  // Si el pliego tiene costo, los datos bancarios son obligatorios.
  if (datos.pliegoGratuito === false) {
    const costo = Number(datos.costoPliegoBs);
    if (vacio(datos.costoPliegoBs) || Number.isNaN(costo) || costo <= 0) {
      e.push('El costo del pliego debe ser mayor a 0 cuando el pliego no es gratuito.');
    }
    requerir(e, datos, 'bancoPagoPliego', 'El banco de pago');
    requerir(e, datos, 'cuentaPagoPliego', 'La cuenta de pago');
    requerir(e, datos, 'titularPagoPliego', 'El titular de la cuenta');
    requerir(e, datos, 'rifPagoPliego', 'El RIF del titular de la cuenta');
  }

  return e;
}

// ---------------------------------------------------------------------------
// Aspectos Generales del Pliego
// ---------------------------------------------------------------------------
function validarAspectosGenerales(datos: Datos): string[] {
  const e: string[] = [];

  // Paso 1 — Régimen legal
  requerir(e, datos, 'datosActoAutorizacionInicio', 'Los datos del acto de autorización de inicio');
  requerir(e, datos, 'autoridadAclaratorias', 'La autoridad que atiende aclaratorias');
  const normativa = datos.normativaLegal;
  const normativaVacia = vacio(normativa) || (Array.isArray(normativa) && normativa.length === 0);
  if (normativaVacia) e.push('Debe indicar al menos una normativa legal.');

  // Paso 2 — Condiciones de oferta
  const dias = Number(datos.diasValidezOferta);
  if (vacio(datos.diasValidezOferta) || Number.isNaN(dias) || dias <= 0) {
    e.push('Los días de validez de la oferta deben ser mayores a 0.');
  }
  const diasGarantia = Number(datos.diasVigenciaGarantiaExtension);
  if (
    vacio(datos.diasVigenciaGarantiaExtension) ||
    Number.isNaN(diasGarantia) ||
    diasGarantia <= 0
  ) {
    e.push('Los días de vigencia de la garantía deben ser mayores a 0.');
  }

  requerirBooleano(e, datos, 'monedaDiferente', '¿Se admite moneda diferente?');
  if (datos.monedaDiferente === true) {
    requerir(e, datos, 'nomMonedaExtranjera', 'El nombre de la moneda extranjera');
  }

  requerirBooleano(e, datos, 'idiomaDiferente', '¿Se admite idioma diferente?');
  if (datos.idiomaDiferente === true) {
    requerir(e, datos, 'nomIdiomaDiferente', 'El nombre del idioma');
  }

  // Paso 3 — Compromiso de Responsabilidad Social
  requerirEnRango(e, datos, 'porcentajeResponsabilidadSocial', 'El porcentaje de CRS', 0, 100);
  requerir(e, datos, 'unidadRespCumplimientoCrs', 'La unidad responsable del CRS');
  requerir(e, datos, 'modalidadCrs', 'La modalidad del CRS');
  requerir(e, datos, 'formaCumplimientoCrs', 'La forma de cumplimiento del CRS');

  // Paso 4 — Garantías y anticipos
  requerirEnRango(
    e,
    datos,
    'porcentajeMantenimientoOferta',
    'El porcentaje de mantenimiento de la oferta',
    0,
    100,
  );
  requerirEnRango(
    e,
    datos,
    'porcentajeFielCumplimiento',
    'El porcentaje de fiel cumplimiento',
    0,
    100,
  );
  requerirBooleano(
    e,
    datos,
    'retencionFielCumplimiento',
    '¿Aplica retención de fiel cumplimiento?',
  );

  requerirBooleano(e, datos, 'requiereGarantiaLaboral', '¿Requiere garantía laboral?');
  if (datos.requiereGarantiaLaboral === true) {
    requerirEnRango(
      e,
      datos,
      'porcentajeGarantiaLaboral',
      'El porcentaje de garantía laboral',
      0,
      100,
    );
    requerirBooleano(e, datos, 'retencionFianzaLaboral', '¿Aplica retención de fianza laboral?');
  }

  requerirBooleano(
    e,
    datos,
    'polizaResponsabilidadCivil',
    '¿Requiere póliza de responsabilidad civil?',
  );
  if (datos.polizaResponsabilidadCivil === true) {
    requerirEnRango(
      e,
      datos,
      'porcentajeResponsabilidadCivil',
      'El porcentaje de responsabilidad civil',
      0,
      100,
    );
    const monto = Number(datos.montoResponsabilidadCivilBs);
    if (vacio(datos.montoResponsabilidadCivilBs) || Number.isNaN(monto) || monto <= 0) {
      e.push('El monto de responsabilidad civil debe ser mayor a 0.');
    }
  }

  requerirBooleano(e, datos, 'anticipoContrato', '¿El contrato contempla anticipo?');
  if (datos.anticipoContrato === true) {
    // El anticipo no puede superar el 50% del monto del contrato.
    requerirEnRango(e, datos, 'porcentajeAnticipo', 'El porcentaje de anticipo', 0, 50);
  }

  requerirBooleano(e, datos, 'anticipoEspecial', '¿Aplica anticipo especial?');
  if (datos.anticipoEspecial === true) {
    requerirEnRango(
      e,
      datos,
      'porcentajeAnticipoEspecial',
      'El porcentaje de anticipo especial',
      0,
      50,
    );
  }

  return e;
}

// ---------------------------------------------------------------------------
// Modelo de contrato
// ---------------------------------------------------------------------------
function validarModeloContrato(datos: Datos): string[] {
  const e: string[] = [];
  const clausulas = Array.isArray(datos?.clauses) ? datos.clauses : [];

  if (clausulas.length === 0) {
    e.push('Debe incluir al menos una cláusula en el modelo de contrato.');
    return e;
  }

  clausulas.forEach((c: Datos, i: number) => {
    if (vacio(c?.titulo)) e.push(`La cláusula ${i + 1} debe tener título.`);
    if (vacio(c?.cuerpoHtml)) e.push(`La cláusula ${i + 1} debe tener contenido.`);
  });

  return e;
}

// ---------------------------------------------------------------------------
// Calificación Legal
// ---------------------------------------------------------------------------
function validarCalificacionLegal(datos: Datos): string[] {
  const e: string[] = [];
  const exigidos: Datos = datos?.exigidos ?? {};
  const sustitutos: Datos = datos?.sustitutos ?? {};
  const personalizados: Datos[] = Array.isArray(datos?.personalizados) ? datos.personalizados : [];

  const catalogo = [...RECAUDOS_SOBRE_1, ...RECAUDOS_SOBRE_2];

  for (const recaudo of catalogo) {
    if (sinResponder(exigidos[recaudo.id])) {
      e.push(`Debe responder SI/NO en el recaudo "${recaudo.id}".`);
      continue;
    }
    // El sustituto solo se responde cuando el recaudo padre fue exigido.
    if (recaudo.sustitutoId && exigidos[recaudo.id] === true) {
      if (sinResponder(sustitutos[recaudo.sustitutoId])) {
        e.push(`Debe indicar si acepta el sustituto "${recaudo.sustitutoId}".`);
      }
    }
  }

  // Al menos un recaudo exigido por sobre (contando catálogo + personalizados).
  for (const sobre of [1, 2] as const) {
    const delCatalogo = catalogo
      .filter((r) => r.sobre === sobre)
      .some((r) => exigidos[r.id] === true);
    const personalizadosDelSobre = personalizados.some(
      (p) => p?.sobre === sobre && p?.exigido === true,
    );

    if (!delCatalogo && !personalizadosDelSobre) {
      e.push(`Debe exigir al menos un recaudo en el Sobre N°${sobre}.`);
    }
  }

  personalizados.forEach((p, i) => {
    if (vacio(p?.descripcion)) {
      e.push(`El recaudo personalizado ${i + 1} debe tener descripción.`);
    } else if (String(p.descripcion).length > 500) {
      e.push(`La descripción del recaudo personalizado ${i + 1} supera los 500 caracteres.`);
    }
    if (sinResponder(p?.tieneModelo)) {
      e.push(`Debe indicar si el recaudo personalizado ${i + 1} tiene modelo.`);
    } else if (p.tieneModelo === true && vacio(p?.archivoModeloUrl)) {
      // Si el Ente declara que el recaudo tiene modelo, debe adjuntar el archivo
      // que los oferentes van a descargar.
      e.push(
        `Debe cargar el documento modelo del recaudo personalizado ${i + 1} ("${p?.descripcion ?? ''}").`,
      );
    }
  });

  return e;
}

// ---------------------------------------------------------------------------
// Calificación Financiera
// ---------------------------------------------------------------------------
const CRITERIOS_FINANCIEROS = [
  'solvencia',
  'rotacion',
  'rendimiento',
  'rentabilidad',
  'endeudamiento',
] as const;

function validarTresRangos(nombre: string, rangos: Datos, inverso: boolean): string[] {
  const e: string[] = [];
  if (!rangos) {
    e.push(`Debe configurar los rangos del criterio "${nombre}".`);
    return e;
  }

  const {
    rangoMaximo,
    puntajeMaximo,
    rangoMedioDesde,
    rangoMedioHasta,
    puntajeMedio,
    rangoMinimo,
    puntajeMinimo,
  } = rangos;

  const numeros = [
    rangoMaximo,
    puntajeMaximo,
    rangoMedioDesde,
    rangoMedioHasta,
    puntajeMedio,
    rangoMinimo,
    puntajeMinimo,
  ];
  if (numeros.some((n) => vacio(n) || Number.isNaN(Number(n)))) {
    e.push(`Todos los rangos y puntajes del criterio "${nombre}" son obligatorios.`);
    return e;
  }

  const max = Number(rangoMaximo);
  const desde = Number(rangoMedioDesde);
  const hasta = Number(rangoMedioHasta);
  const min = Number(rangoMinimo);

  if (inverso) {
    // En endeudamiento el óptimo es el valor más bajo.
    if (!(max < desde && desde <= hasta && hasta <= min)) {
      e.push(
        `Los rangos del criterio "${nombre}" deben ser inversos: óptimo < desde ≤ hasta ≤ deficiente.`,
      );
    }
  } else if (!(max > hasta && hasta >= desde && desde >= min)) {
    e.push(
      `Los rangos del criterio "${nombre}" deben ser ascendentes: máximo > hasta ≥ desde ≥ mínimo.`,
    );
  }

  const pMax = Number(puntajeMaximo);
  const pMedio = Number(puntajeMedio);
  const pMin = Number(puntajeMinimo);
  if (!(pMax >= pMedio && pMedio >= pMin)) {
    e.push(`Los puntajes del criterio "${nombre}" deben ir de mayor a menor.`);
  }

  return e;
}

function validarCalificacionFinanciera(datos: Datos): string[] {
  const e: string[] = [];
  let algunoActivo = false;

  if (datos?.criterioCalifFinanDescapital === true) {
    algunoActivo = true;
    requerirEnRango(
      e,
      datos,
      'puntajeMaximoDescapital',
      'El puntaje máximo de descapitalización',
      0,
      100,
    );
  }

  for (const criterio of CRITERIOS_FINANCIEROS) {
    const activoKey = `criterioCalifFinan${criterio.charAt(0).toUpperCase()}${criterio.slice(1)}`;
    if (datos?.[activoKey] === true) {
      algunoActivo = true;
      e.push(
        ...validarTresRangos(
          criterio,
          datos?.[`rangos${criterio.charAt(0).toUpperCase()}${criterio.slice(1)}`],
          criterio === 'endeudamiento',
        ),
      );
    }
  }

  if (!algunoActivo) {
    e.push('Debe activar al menos un criterio de calificación financiera.');
  }

  requerirEnRango(
    e,
    datos,
    'puntuacionMinimaCalifFinanciera',
    'La puntuación mínima de calificación financiera',
    1,
    100,
  );

  return e;
}

// ---------------------------------------------------------------------------
// Criterios con rangos (Calificación Técnica y Evaluación Técnica/Económica)
// ---------------------------------------------------------------------------
interface ResultadoCriterios {
  errores: string[];
  total: number;
}

function validarCriteriosConRangos(datos: Datos, etiqueta: string): ResultadoCriterios {
  const errores: string[] = [];
  const criterios: Datos[] = Array.isArray(datos?.criterios) ? datos.criterios : [];

  if (criterios.length === 0) {
    errores.push(`Debe definir al menos un criterio de ${etiqueta}.`);
    return { errores, total: 0 };
  }

  let total = 0;

  criterios.forEach((c, i) => {
    const nombre = c?.nombre ?? `#${i + 1}`;

    if (vacio(c?.nombre)) errores.push(`El criterio ${i + 1} de ${etiqueta} debe tener nombre.`);

    const puntuacion = Number(c?.puntuacion);
    if (vacio(c?.puntuacion) || Number.isNaN(puntuacion) || puntuacion <= 0) {
      errores.push(`El criterio "${nombre}" debe tener una puntuación mayor a 0.`);
      return;
    }
    total += puntuacion;

    const rangos: Datos[] = Array.isArray(c?.rangos) ? c.rangos : [];
    rangos.forEach((r, j) => {
      if (vacio(r?.descripcion)) {
        errores.push(`El rango ${j + 1} del criterio "${nombre}" debe tener descripción.`);
      }
      const puntajeRango = Number(r?.puntaje);
      if (vacio(r?.puntaje) || Number.isNaN(puntajeRango)) {
        errores.push(`El rango ${j + 1} del criterio "${nombre}" debe tener puntaje.`);
        return;
      }
      // Ningún rango puede otorgar más puntos que su criterio padre.
      if (puntajeRango > puntuacion) {
        errores.push(
          `El rango ${j + 1} del criterio "${nombre}" (${puntajeRango}) no puede superar la puntuación del criterio (${puntuacion}).`,
        );
      }
    });
  });

  return { errores, total };
}

function validarCalificacionTecnica(datos: Datos): string[] {
  const { errores, total } = validarCriteriosConRangos(datos, 'calificación técnica');

  // La suma de las ponderaciones debe ser exactamente 100 puntos.
  if (total !== 100) {
    errores.push(
      `La suma de las ponderaciones de los criterios técnicos debe ser exactamente 100 puntos. Suma actual: ${total} puntos.`,
    );
  }

  const minima = Number(datos?.puntuacionMinimaCalifTecnica);
  if (vacio(datos?.puntuacionMinimaCalifTecnica) || Number.isNaN(minima) || minima <= 0) {
    errores.push('Debe indicar la puntuación mínima aprobatoria de la calificación técnica.');
  } else if (minima > total) {
    errores.push(
      `La puntuación mínima (${minima}) no puede superar el total de los criterios (${total}).`,
    );
  }

  return errores;
}

function validarEvaluacionTecnicaEconomica(datos: Datos): string[] {
  const errores: string[] = [];

  const tecnica = validarCriteriosConRangos(datos?.tecnica ?? {}, 'evaluación técnica');
  const economica = validarCriteriosConRangos(datos?.economica ?? {}, 'evaluación económica');

  errores.push(...tecnica.errores, ...economica.errores);

  // Bolsa única compartida: técnica + económica debe sumar exactamente 100.
  const total = tecnica.total + economica.total;
  if (total !== 100) {
    errores.push(
      `La suma de la evaluación técnica (${tecnica.total}) y económica (${economica.total}) debe ser exactamente 100 puntos. Suma actual: ${total} puntos.`,
    );
  }

  const minimaTecnica = Number(datos?.tecnica?.puntuacionMinima);
  if (!Number.isNaN(minimaTecnica) && minimaTecnica > tecnica.total) {
    errores.push(
      `La puntuación mínima técnica (${minimaTecnica}) no puede superar el total técnico (${tecnica.total}).`,
    );
  }

  const minimaEconomica = Number(datos?.economica?.puntuacionMinima);
  if (!Number.isNaN(minimaEconomica) && minimaEconomica > economica.total) {
    errores.push(
      `La puntuación mínima económica (${minimaEconomica}) no puede superar el total económico (${economica.total}).`,
    );
  }

  return errores;
}

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------
export function validarCompletar(
  modulo: MicromoduloKey,
  datos: Datos,
  ctx: ContextoValidacion,
): string[] {
  switch (modulo) {
    case 'actividades-previas':
      return validarActividadesPrevias(datos, ctx);
    case 'llamado':
      return validarLlamado(datos);
    case 'aspectos-generales':
      return validarAspectosGenerales(datos);
    case 'modelo-contrato':
      return validarModeloContrato(datos);
    case 'calificacion-legal':
      return validarCalificacionLegal(datos);
    case 'calificacion-financiera':
      return validarCalificacionFinanciera(datos);
    case 'calificacion-tecnica':
      return validarCalificacionTecnica(datos);
    case 'evaluacion-tecnica-economica':
      return validarEvaluacionTecnicaEconomica(datos);
    default:
      return [];
  }
}
