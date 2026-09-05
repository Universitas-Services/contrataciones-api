import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { numeroALetras } from '../common/utils/numero-a-letras.util';
import {
  TOKENS_CONTRATO,
  TOKENS_POR_CLAVE,
  normalizarEtiqueta,
} from './constants/tokens-contrato.constants';

/** Encuentra todo lo que esté entre corchetes en el texto de una cláusula. */
const RE_CORCHETES = /\[([^\]\n]{1,120})\]/g;

export interface TokenEncontrado {
  /** Texto tal cual aparece en la cláusula, incluidos los corchetes. */
  original: string;
  /** Contenido del corchete, normalizado. */
  clave: string;
  /** true si la clave existe en el catálogo. */
  reconocido: boolean;
}

export interface ResultadoValidacion {
  valido: boolean;
  tokens: TokenEncontrado[];
  errores: string[];
}

/** Modo de renderizado según el documento que se esté generando. */
export type ModoRender =
  /** Fase 1: los datos aún no existen, se muestra la etiqueta descriptiva. */
  | 'ETIQUETA'
  /** Fase 1, variante: se sustituye por una línea para llenar a mano. */
  | 'LINEA'
  /** Fase 3 y 4: se sustituye por el valor real. */
  | 'VALOR';

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo completo, para que el frontend arme su selector. */
  listarCatalogo() {
    return {
      data: TOKENS_CONTRATO.map((t) => ({
        etiqueta: t.etiqueta,
        /** Lo que hay que insertar en el texto de la cláusula. */
        insertar: `[${t.etiqueta}]`,
        descripcion: t.descripcion,
        disponibleDesde: t.disponibleDesde,
        fuente: t.fuente,
      })),
      meta: { total: TOKENS_CONTRATO.length },
    };
  }

  /** Extrae los corchetes de un texto y marca cuáles reconoce el catálogo. */
  extraer(texto: string): TokenEncontrado[] {
    const encontrados: TokenEncontrado[] = [];
    for (const match of texto.matchAll(RE_CORCHETES)) {
      const clave = normalizarEtiqueta(match[1]);
      encontrados.push({
        original: match[0],
        clave,
        reconocido: TOKENS_POR_CLAVE.has(clave),
      });
    }
    return encontrados;
  }

  /** Sugiere la etiqueta más parecida cuando una no se reconoce. */
  private sugerir(clave: string): string | null {
    let mejor: { etiqueta: string; distancia: number } | null = null;

    for (const token of TOKENS_CONTRATO) {
      const candidata = normalizarEtiqueta(token.etiqueta);
      const distancia = this.distancia(clave, candidata);
      if (!mejor || distancia < mejor.distancia) {
        mejor = { etiqueta: token.etiqueta, distancia };
      }
    }

    // Sólo se sugiere si el parecido es razonable.
    if (mejor && mejor.distancia <= Math.max(3, Math.floor(clave.length * 0.35))) {
      return mejor.etiqueta;
    }
    return null;
  }

  /** Distancia de Levenshtein, para el "¿quisiste decir...?". */
  private distancia(a: string, b: string): number {
    const filas = a.length + 1;
    const cols = b.length + 1;
    let previa = Array.from({ length: cols }, (_, j) => j);

    for (let i = 1; i < filas; i++) {
      const actual = [i];
      for (let j = 1; j < cols; j++) {
        const costo = a[i - 1] === b[j - 1] ? 0 : 1;
        actual[j] = Math.min(actual[j - 1] + 1, previa[j] + 1, previa[j - 1] + costo);
      }
      previa = actual;
    }
    return previa[cols - 1];
  }

  /**
   * Valida el texto de una cláusula antes de guardarlo. Ningún corchete
   * desconocido debe llegar a la base: si lo hiciera, el documento final
   * saldría con el corchete crudo y nadie se enteraría.
   */
  validar(texto: string): ResultadoValidacion {
    const tokens = this.extraer(texto);
    const errores: string[] = [];

    for (const token of tokens) {
      if (token.reconocido) continue;

      const sugerencia = this.sugerir(token.clave);
      errores.push(
        sugerencia
          ? `El dato ${token.original} no existe en el catálogo. ¿Quisiste decir [${sugerencia}]?`
          : `El dato ${token.original} no existe en el catálogo de datos disponibles.`,
      );
    }

    return { valido: errores.length === 0, tokens, errores };
  }

  /**
   * Reúne los valores reales de un expediente. Los datos de adjudicación sólo
   * aparecen si el expediente ya fue adjudicado.
   */
  async resolverValores(expedienteId: string): Promise<Record<string, string>> {
    const expediente = await this.prisma.expedienteContratacion.findFirst({
      where: { id: expedienteId, deletedAt: null },
      include: {
        ente: true,
        fasePreparatoria: true,
        adjudicacion: { include: { ofertaGanadora: true } },
      },
    });
    if (!expediente) throw new NotFoundException(`Expediente ${expedienteId} no encontrado`);

    const valores: Record<string, string> = {};
    const set = (etiqueta: string, valor: string | number | Prisma.Decimal | null | undefined) => {
      if (valor === null || valor === undefined || valor === '') return;
      valores[normalizarEtiqueta(etiqueta)] = typeof valor === 'string' ? valor : String(valor);
    };

    // Datos disponibles desde el expediente
    const fase = expediente.fasePreparatoria;
    set('OBJETO DEL CONTRATO', expediente.descripcionObjeto);
    set('CODIGO DEL PROCEDIMIENTO', expediente.codigoNomenclatura);
    set('NOMBRE DEL ENTE CONTRATANTE', expediente.ente?.nombre);
    set('RIF DEL ENTE CONTRATANTE', expediente.ente?.rif);
    set('PLAZO DE EJECUCION EN DIAS', fase?.plazoEjecucionProcedimiento);
    set('LUGAR DE EJECUCION', fase?.lugarLogisticaEjecucion);
    set('PORCENTAJE DE FIEL CUMPLIMIENTO', fase?.porcentajeFielCumplimiento);
    set('PORCENTAJE DE ANTICIPO', fase?.porcentajeAnticipo);
    set('PORCENTAJE DE RESPONSABILIDAD SOCIAL', fase?.porcentajeResponsabilidadSocial);

    // Datos que sólo existen tras la adjudicación
    const adj = expediente.adjudicacion;
    if (adj) {
      const monto = Number(adj.montoAdjudicadoBs);
      set('MONTO CONTRATO EN NUMEROS', monto.toLocaleString('es-VE', { minimumFractionDigits: 2 }));
      set('MONTO CONTRATO EN LETRAS', numeroALetras(monto));
      set('PARTIDA PRESUPUESTARIA', adj.partidaPresupuestariaGasto);

      const crs = Number(adj.montoCrsBs);
      set('MONTO CRS EN NUMEROS', crs.toLocaleString('es-VE', { minimumFractionDigits: 2 }));
      set('MONTO CRS EN LETRAS', numeroALetras(crs));
      set('FECHA DE ADJUDICACION', adj.fechaActoAdjudicacion.toLocaleDateString('es-VE'));

      const oferta = adj.ofertaGanadora;
      set('NOMBRE DEL CONTRATISTA', oferta?.nombreProveedorOferente);
      set('RIF DEL CONTRATISTA', oferta?.rifProveedorOferente);
      set('REPRESENTANTE LEGAL DEL CONTRATISTA', oferta?.nombreRepLegalOferente);
      set('CEDULA DEL REPRESENTANTE LEGAL', oferta?.cedulaRepLegalOferente);
      set('REGISTRO MERCANTIL DEL CONTRATISTA', oferta?.datosRegistroMercantilProveedorOferente);
    }

    return valores;
  }

  /**
   * Sustituye los corchetes del texto según el modo pedido.
   *
   * En modo VALOR, un dato que todavía no exista conserva su etiqueta: así el
   * pliego de la Fase 1 muestra "MONTO CONTRATO EN LETRAS" y el contrato de la
   * Fase 4, ya adjudicado, muestra la cifra real.
   */
  renderizar(texto: string, modo: ModoRender, valores: Record<string, string> = {}): string {
    return texto.replace(RE_CORCHETES, (original, contenido: string) => {
      const clave = normalizarEtiqueta(contenido);
      const token = TOKENS_POR_CLAVE.get(clave);

      // Un corchete que no está en el catálogo se deja intacto para que sea
      // visible que algo quedó sin resolver.
      if (!token) return original;

      switch (modo) {
        case 'ETIQUETA':
          return token.etiqueta;
        case 'LINEA':
          return '_'.repeat(Math.max(20, token.etiqueta.length));
        case 'VALOR':
          return valores[clave] ?? token.etiqueta;
      }
    });
  }

  /** Renderiza el texto de una cláusula contra un expediente concreto. */
  async renderizarParaExpediente(texto: string, expedienteId: string, modo: ModoRender) {
    const valores = modo === 'VALOR' ? await this.resolverValores(expedienteId) : {};
    const tokens = this.extraer(texto);

    return {
      modo,
      texto: this.renderizar(texto, modo, valores),
      tokens: tokens.map((t) => ({
        ...t,
        resuelto: modo === 'VALOR' ? valores[t.clave] !== undefined : false,
      })),
    };
  }
}
