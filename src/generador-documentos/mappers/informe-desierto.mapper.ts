import { puntajeIndice } from '../../evaluacion-fase3/hub/scoring.service';
import type {
  CriterioPuntuado,
  EstadoEvaluacion,
  EstadoFinanciera,
  EstadoLegal,
  EstadoPromocion,
  EstadoTecnica,
  FormPuntuado,
  PlantillasSnapshot,
} from '../../evaluacion-fase3/hub/types/hub.types';

/**
 * Secciones por oferente de los Informes de Recomendación Desierto #2 y #3.
 * Lee el snapshot de plantillas y el estado del hub de cada evaluación.
 * Los tokens de Fase 1 (matrices genéricas, mod_*) los aporta mapDatosPliegoCondiciones.
 */

interface EvaluacionHub {
  nombreProveedorEvaluado: string;
  rifProveedorEvaluado: string;
  oferenteCalificado: boolean | null;
  indVerificadoGarantia: boolean | null;
  indVerificadoCrs: boolean | null;
  justificacionCalificadoLegal: string | null;
  justificacionCalificadaFinanciera: string | null;
  justificacionCalificadoTecnica: string | null;
  plantillasSnapshot: unknown;
  hubLegal: unknown;
  hubFinanciera: unknown;
  hubTecnica: unknown;
  hubEvaluacion: unknown;
  hubPromocion: unknown;
}

export interface OfertaConEvaluacion {
  nombreProveedorOferente: string;
  rifProveedorOferente: string;
  nombreRepLegalOferente: string;
  cedulaRepLegalOferente: string;
  numeroSobresEntregados: number | null;
  evaluacion: EvaluacionHub | null;
}

const siNo = (v: boolean | null | undefined) => (v === true ? 'SÍ' : v === false ? 'NO' : '___');

const pts = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(Number(v)) ? '___' : Number(v).toFixed(2);

const json = <T>(v: unknown): T | null => (v !== null && typeof v === 'object' ? (v as T) : null);

/** modCartaManifestacionVoluntadAuAu → carta_manifestacion_voluntad_au_au */
const tokenRespuestaLegal = (id: string) =>
  id
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/^mod_/, '');

interface CriterioResuelto {
  nombre: string;
  puntos: string;
  rangos: Array<{ descripcion: string; valor: string; puntos: string }>;
}

/** Puntos por criterio y rango elegido (Modo A: varios rangos; Modo B: puntaje libre). */
function resolverPuntuados(criterios: CriterioPuntuado[], form: FormPuntuado | undefined) {
  return criterios.map((c): CriterioResuelto => {
    const r = form?.criterios?.[c.id];
    const modoA = c.rangos.length > 1;
    const elegido = modoA ? c.rangos.find((x) => x.id === r?.rangoIdSeleccionado) : c.rangos[0];
    const puntos = modoA ? elegido?.puntaje : Number(r?.puntuacionObtenida);
    return {
      nombre: c.nombre || '___',
      puntos: pts(puntos),
      rangos: c.rangos.map((x) => {
        const sel = elegido?.id === x.id;
        return {
          descripcion: x.descripcion || '___',
          valor: sel ? r?.valorObtenido || '___' : '',
          puntos: sel ? pts(puntos) : '',
        };
      }),
    };
  });
}

export function mapOferentesDesierto(
  ofertas: OfertaConEvaluacion[],
  opciones: { incluirEvaluacion: boolean },
): Record<string, unknown> {
  const oferentes_acto = ofertas.map((of, i) => ({
    numero: i + 1,
    nombre_proveedor_evaluado_au_au: of.nombreProveedorOferente || '___',
    rif_proveedor_evaluado_au_au: of.rifProveedorOferente || '___',
    nombre_rep_legal_evaluado_au_au: of.nombreRepLegalOferente || '___',
    cedula_rep_legal_evaluado_au_au: of.cedulaRepLegalOferente || '___',
    num_sobres_entregados_au_au: of.numeroSobresEntregados ?? '___',
  }));

  const evaluadas = ofertas
    .map((of) => of.evaluacion)
    .filter((ev): ev is EvaluacionHub => !!ev && !!json(ev.plantillasSnapshot));

  const identidad = (ev: EvaluacionHub) => ({
    nombre_proveedor_evaluado_au_au: ev.nombreProveedorEvaluado || '___',
    rif_proveedor_evaluado_au_au: ev.rifProveedorEvaluado || '___',
    nombre_proveedor_oferente_au_au: ev.nombreProveedorEvaluado || '___',
    rif_proveedor_oferente_au_au: ev.rifProveedorEvaluado || '___',
  });

  // ── Calificación legal ────────────────────────────────────────────────
  const conLegal = evaluadas.filter((ev) => json<EstadoLegal>(ev.hubLegal)?.submitted);

  const requisitos_preliminares = conLegal.map((ev, i) => ({
    numero: i + 1,
    ...identidad(ev),
    ind_verificado_garantia_au_au: siNo(ev.indVerificadoGarantia),
    ind_verificado_crs_au_au: siNo(ev.indVerificadoCrs),
  }));

  const calificacion_legal_au_au = conLegal.map((ev) => {
    const snap = json<PlantillasSnapshot>(ev.plantillasSnapshot)!;
    const legal = json<EstadoLegal>(ev.hubLegal)!;
    const respuestas: Record<string, boolean> = {};
    const otrosSobre1: Array<Record<string, unknown>> = [];
    for (const item of snap.legal.items) {
      const consignado = legal.form?.items?.[item.id]?.consignado === 'SI';
      if (item.personalizado) {
        if (item.sobre === 1) {
          otrosSobre1.push({
            desc_otro_recaudo_sobre1_au_au: item.etiquetaCorta,
            estado_entrega_otro_sobre1_au_au: consignado,
          });
        }
        continue;
      }
      respuestas[tokenRespuestaLegal(item.id)] = consignado;
    }
    return {
      ...identidad(ev),
      ...respuestas,
      desc_otro_recaudo_sobre1_au_au: otrosSobre1,
      oferente_calificado_legal_au_au: legal.oferenteCalificadoLegal
        ? 'CALIFICA LEGALMENTE'
        : 'NO CALIFICA LEGALMENTE',
      justificacion_calificado_legal_au_au:
        legal.form?.justificacion || ev.justificacionCalificadoLegal || '___',
    };
  });

  // ── Calificación financiera ───────────────────────────────────────────
  const calificacion_financiera_au_au = evaluadas
    .filter((ev) => json<EstadoFinanciera>(ev.hubFinanciera)?.submitted)
    .map((ev) => {
      const snap = json<PlantillasSnapshot>(ev.plantillasSnapshot)!;
      const fin = json<EstadoFinanciera>(ev.hubFinanciera)!;
      const valores: Record<string, string> = {};
      for (const c of snap.financiera.criterios) {
        const valor = String(fin.form?.criterios?.[c.id]?.valor ?? '').trim();
        if (c.kind === 'descapital') {
          const no = valor.toUpperCase() === 'NO';
          valores[`val_${c.id}_eval_au_au`] = valor ? (no ? 'NO' : 'SÍ') : '___';
          valores[`pts_${c.id}_eval_au_au`] = valor ? pts(no ? c.puntajeMaximo : 0) : '___';
        } else {
          const n = Number(valor.replace(',', '.'));
          valores[`val_${c.id}_eval_au_au`] = valor || '___';
          valores[`pts_${c.id}_eval_au_au`] =
            valor && Number.isFinite(n) ? pts(puntajeIndice(c, n)) : '___';
        }
      }
      return {
        ...identidad(ev),
        ...valores,
        oferente_calificado_financiera_au_au: fin.oferenteCalificadoFinanciera
          ? 'CALIFICA FINANCIERAMENTE'
          : 'NO CALIFICA FINANCIERAMENTE',
        justificacion_calificado_financiera_au_au:
          fin.form?.justificacion || ev.justificacionCalificadaFinanciera || '___',
      };
    });

  // ── Calificación técnica ──────────────────────────────────────────────
  const conTecnica = evaluadas.filter((ev) => json<EstadoTecnica>(ev.hubTecnica)?.submitted);
  const calificacion_tecnica_au_au = conTecnica.map((ev) => {
    const snap = json<PlantillasSnapshot>(ev.plantillasSnapshot)!;
    const tec = json<EstadoTecnica>(ev.hubTecnica)!;
    const criterios = resolverPuntuados(snap.tecnica.criterios, tec.form);
    return {
      ...identidad(ev),
      calificacion_tecnica_antes_au_au: criterios.map((c) => ({
        criterio_calificacion_tecnica_au_au: c.nombre,
        puntuacion_obtenida_criterio_calif_tecnica_au_au: c.puntos,
      })),
      total_puntos_calif_tecnica_au_au: pts(tec.total),
      matriz_calificacion_tecnica_au_au: criterios.map((c) => ({
        criterio_calificacion_tecnica_au_au: c.nombre,
        calificacion_tecnica_desde_au_au: c.rangos.map((r) => ({
          rango_criterio_calificacion_tecnica_au_au: r.descripcion,
          valor_obtenido_criterio_calif_tecnica_au_au: r.valor,
          puntuacion_obtenida_rango_criterio_calificacion_tecnica_au_au: r.puntos,
        })),
      })),
      oferente_calificado_tecnica_au_au: tec.oferenteCalificadoTecnica ? 'SÍ' : 'NO',
      justificacion_calificado_tecnica_au_au:
        tec.form?.justificacion || ev.justificacionCalificadoTecnica || '___',
    };
  });

  const participantes_descalificados_au_au = evaluadas
    .filter((ev) => ev.oferenteCalificado === false)
    .map(identidad);

  const datos: Record<string, unknown> = {
    oferentes_acto,
    requisitos_preliminares,
    calificacion_legal_au_au,
    calificacion_financiera_au_au,
    calificacion_tecnica_au_au,
    participantes_descalificados_au_au,
    descalificacion_au_au: participantes_descalificados_au_au.length > 0,
  };

  if (!opciones.incluirEvaluacion) return datos;

  // ── Desierto #3: evaluación técnica/económica y promoción ─────────────
  datos.conclusion_calificacion_au_au = conTecnica
    .filter((ev) => json<EstadoTecnica>(ev.hubTecnica)?.oferenteCalificadoTecnica === true)
    .map(identidad);

  const conEvaluacion = evaluadas.filter(
    (ev) => json<EstadoEvaluacion>(ev.hubEvaluacion)?.submitted,
  );
  const evaluaciones = conEvaluacion.map((ev) => {
    const snap = json<PlantillasSnapshot>(ev.plantillasSnapshot)!;
    const evaluacion = json<EstadoEvaluacion>(ev.hubEvaluacion)!;
    const promo = json<EstadoPromocion>(ev.hubPromocion);
    const planPromo = snap.promocion;
    const tec = resolverPuntuados(snap.evaluacion.tecnica.criterios, evaluacion.form?.tecnica);
    const eco = resolverPuntuados(snap.evaluacion.economica.criterios, evaluacion.form?.economica);
    const formPromo = promo?.submitted ? promo.form : undefined;

    const bonoVan = formPromo?.consignoDeclaracionVan ? Number(formPromo.ptsBonoVan ?? 0) : 0;
    const bonoLocal = formPromo?.aplicaPrefLocal ? Number(planPromo?.puntuacionBonoLocal ?? 0) : 0;
    const bonoSujeto = formPromo?.aplicaBonoSujeto
      ? Number(planPromo?.puntuacionBonoSujeto ?? 0)
      : 0;

    return {
      ...identidad(ev),
      criterios_evaluacion_tecnica_antes_au_au: tec.map((c) => ({
        criterio_evaluacion_tecnica_au_au: c.nombre,
        puntuacion_obtenida_criterio_evaluacion_tecnica_au_au: c.puntos,
      })),
      matriz_criterio_evaluacion_tecnica_au_au: tec.map((c) => ({
        criterio_evaluacion_tecnica_au_au: c.nombre,
        criterios_evaluacion_tecnica_desde_au_au: c.rangos.map((r) => ({
          rango_criterio_evaluacion_tecnica_au_au: r.descripcion,
          valor_obtenido_criterio_evaluacion_tecnica_au_au: r.valor,
          puntuacion_obtenida_criterio_evaluacion_tecnica_au_au: r.puntos,
        })),
      })),
      total_puntos_eval_tecnica_au_au: pts(evaluacion.totalTecnico),
      criterios_evaluacion_economico_antes_au_au: eco.map((c) => ({
        criterio_evaluacion_economico_au_au: c.nombre,
        puntuacion_obtenida_criterio_eval_economica_au_au: c.puntos,
      })),
      matriz_criterio_evaluacion_economico_au_au: eco.map((c) => ({
        criterio_evaluacion_economico_au_au: c.nombre,
        criterios_evaluacion_economico_desde_au_au: c.rangos.map((r) => ({
          rango_criterio_evaluacion_economico_au_au: r.descripcion,
          valor_obtenido_criterio_eval_economica_au_au: r.valor,
          puntuacion_obtenida_criterio_eval_economica_au_au: r.puntos,
        })),
      })),
      total_puntos_eval_economica_au_au: pts(evaluacion.totalEconomico),
      total_evaluacion_oferente_au_au: pts(evaluacion.notaBase),
      // Promoción económica
      tienePromocion: !!formPromo,
      si_consigno_declaracion_van_au_au: formPromo?.consignoDeclaracionVan === true,
      no_consigno_declaracion_van_au_au: formPromo?.consignoDeclaracionVan === false,
      val_van_oferente_au_au: pts(formPromo?.valVanOferente),
      pts_bono_van_au_au: pts(bonoVan),
      si_aplica_pref_local_au_au: formPromo?.aplicaPrefLocal === true,
      no_aplica_pref_local_au_au: formPromo?.aplicaPrefLocal === false,
      pts_bono_local_au_au: pts(bonoLocal),
      si_aplica_bono_sujeto_au_au: formPromo?.aplicaBonoSujeto === true,
      no_aplica_bono_sujeto_au_au: formPromo?.aplicaBonoSujeto === false,
      pts_bono_sujeto_au_au: pts(bonoSujeto),
      total_puntos_promocion_au_au: pts(promo?.totalPuntosPromocion ?? 0),
      puntuacion_final_con_bonos_au_au: pts(
        promo?.puntuacionFinalConBonos ?? evaluacion.notaBase ?? null,
      ),
      _orden: Number(promo?.puntuacionFinalConBonos ?? evaluacion.notaBase ?? 0),
    };
  });

  const ordenadas = [...evaluaciones].sort((a, b) => b._orden - a._orden);
  const limpiar = ({ _orden, tienePromocion, ...resto }: (typeof evaluaciones)[number]) => {
    void _orden;
    void tienePromocion;
    return resto;
  };

  datos.evaluacion_tecnica_au_au = evaluaciones.map(limpiar);
  datos.evaluacion_economica_au_au = evaluaciones.map(limpiar);
  datos.matriz_promocion_oferentes_au_au = evaluaciones
    .filter((e) => e.tienePromocion)
    .map(limpiar);
  datos.matriz_total_evaluacion_au_au = ordenadas.map(limpiar);

  return datos;
}
