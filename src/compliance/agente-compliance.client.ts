import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import type { ResultadoLlamada } from './reintentos.util';

/** Catálogo tal como lo devuelve `GET /api/catalogo`. */
export interface CatalogoAgente {
  modalidades: {
    valor: string;
    nombre: string;
    /** disponible | sin_validar | sin_cuestionarios */
    estado: string;
    checklist: { tipo_documento: string; nombre: string }[];
  }[];
  tipos_contratacion: { valor: string; nombre: string }[];
}

export interface PeticionConversar {
  usuario_nombre: string;
  ente: string;
  expediente: {
    nomenclatura: string | null;
    nombre: string | null;
    modalidad: string | null;
    tipo_contratacion: string | null;
    documentos: unknown[];
    dictamenes: number;
  };
  historial: { rol: 'usuario' | 'agente'; texto: string }[];
  mensaje: string;
}

export interface AccionAgente {
  accion: string;
  [campo: string]: unknown;
}

export interface RespuestaConversar {
  respuesta: string;
  acciones: AccionAgente[];
}

/** Resultado de una llamada larga: los datos si salió bien, y lo necesario para decidir si no. */
export interface LlamadaAgente<T> extends ResultadoLlamada {
  datos?: T;
}

const QUINCE_MINUTOS = 15 * 60 * 1000;
const UNA_HORA = 60 * 60 * 1000;
const ESPERA_CHAT_MS = 60 * 1000;

/**
 * Único punto de contacto con el agente. La clave sale de `COMPLIANCE_AGENT_KEY`
 * y va solo en el header: nunca se escribe en logs.
 */
@Injectable()
export class AgenteComplianceClient {
  private readonly logger = new Logger(AgenteComplianceClient.name);
  private catalogo: { datos: CatalogoAgente; leidoAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  get configurado(): boolean {
    return !!this.url && !!this.clave;
  }

  private get url(): string {
    return (this.config.get<string>('COMPLIANCE_AGENT_URL') ?? '').replace(/\/+$/, '');
  }

  private get clave(): string {
    return this.config.get<string>('COMPLIANCE_AGENT_KEY') ?? '';
  }

  private get headers() {
    return { 'X-Agent-Key': this.clave };
  }

  private asegurarConfigurado() {
    if (!this.configurado) {
      throw new ServiceUnavailableException('El agente de compliance no está configurado.');
    }
  }

  /** Catálogo en memoria por una hora: modalidades, tipos y checklist. */
  async obtenerCatalogo(): Promise<CatalogoAgente> {
    if (this.catalogo && Date.now() - this.catalogo.leidoAt < UNA_HORA) {
      return this.catalogo.datos;
    }
    this.asegurarConfigurado();
    try {
      const r = await axios.get<CatalogoAgente>(`${this.url}/api/catalogo`, {
        headers: this.headers,
        timeout: 30000,
      });
      this.catalogo = { datos: r.data, leidoAt: Date.now() };
      return r.data;
    } catch (error) {
      // Si el agente no responde, sirve el último catálogo conocido.
      if (this.catalogo) return this.catalogo.datos;
      this.logger.error(`No se pudo leer el catálogo: ${describirError(error)}`);
      throw new ServiceUnavailableException('No se pudo leer el catálogo del agente.');
    }
  }

  async analizar(datos: {
    archivo: Buffer;
    nombreArchivo: string;
    mimeType?: string | null;
    nomenclatura: string;
    modalidad: string;
    tipoContratacion: string;
    tipoDocumento: string;
  }): Promise<LlamadaAgente<Record<string, unknown>>> {
    this.asegurarConfigurado();
    const form = new FormData();
    form.append(
      'archivo',
      new Blob([new Uint8Array(datos.archivo)], {
        type: datos.mimeType || 'application/octet-stream',
      }),
      datos.nombreArchivo,
    );
    form.append('nomenclatura', datos.nomenclatura);
    form.append('modalidad', datos.modalidad);
    form.append('tipo_contratacion', datos.tipoContratacion);
    form.append('tipo_documento', datos.tipoDocumento);

    return this.llamar(() =>
      axios.post(`${this.url}/api/analizar`, form, {
        headers: this.headers,
        timeout: QUINCE_MINUTOS,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
      }),
    );
  }

  async dictamen(cuerpo: {
    nomenclatura: string;
    modalidad: string;
    tipo_contratacion: string;
    documentos: unknown[];
    forzar_final: boolean;
  }): Promise<LlamadaAgente<Record<string, unknown>>> {
    this.asegurarConfigurado();
    return this.llamar(() =>
      axios.post(`${this.url}/api/dictamen`, cuerpo, {
        headers: this.headers,
        timeout: QUINCE_MINUTOS,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true,
      }),
    );
  }

  /**
   * El usuario espera la respuesta: un solo intento de 60 segundos. Si falla,
   * el frontend muestra «No pude responder, intenta de nuevo».
   */
  async conversar(peticion: PeticionConversar): Promise<RespuestaConversar> {
    this.asegurarConfigurado();
    try {
      const r = await axios.post<RespuestaConversar>(`${this.url}/api/conversar`, peticion, {
        headers: this.headers,
        timeout: ESPERA_CHAT_MS,
      });
      return {
        respuesta: typeof r.data?.respuesta === 'string' ? r.data.respuesta : '',
        acciones: Array.isArray(r.data?.acciones) ? r.data.acciones : [],
      };
    } catch (error) {
      this.logger.warn(`El chat del agente falló: ${describirError(error)}`);
      throw new ServiceUnavailableException('No pude responder, intenta de nuevo.');
    }
  }

  private async llamar<T>(
    peticion: () => Promise<AxiosResponse<unknown>>,
  ): Promise<LlamadaAgente<T>> {
    let r: AxiosResponse<unknown>;
    try {
      r = await peticion();
    } catch (error) {
      // Conexión cortada o tiempo agotado: no sabemos si terminó.
      this.logger.warn(`Llamada al agente sin respuesta: ${describirError(error)}`);
      return { status: null };
    }
    if (r.status === 200) return { status: 200, datos: r.data as T };

    const retryAfter = Number(r.headers?.['retry-after']);
    return {
      status: r.status,
      retryAfterS: Number.isFinite(retryAfter) ? retryAfter : null,
      detalle: extraerDetalle(r.data),
    };
  }
}

/** `detail` del agente, o el cuerpo en texto si viene de la plataforma de Cloud Run. */
export function extraerDetalle(cuerpo: unknown): string | null {
  if (cuerpo == null) return null;
  if (typeof cuerpo === 'string') return cuerpo.slice(0, 1000) || null;
  if (typeof cuerpo === 'object' && 'detail' in cuerpo) {
    const detalle = (cuerpo as { detail: unknown }).detail;
    return typeof detalle === 'string' ? detalle : JSON.stringify(detalle).slice(0, 1000);
  }
  return JSON.stringify(cuerpo).slice(0, 1000);
}

/** Mensaje de error sin headers: así la clave nunca llega a los logs. */
function describirError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response ? `HTTP ${error.response.status}` : (error.code ?? error.message);
  }
  return error instanceof Error ? error.message : String(error);
}
