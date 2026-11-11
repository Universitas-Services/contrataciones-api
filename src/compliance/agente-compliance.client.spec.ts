import { ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { AgenteComplianceClient, extraerDetalle } from './agente-compliance.client';

jest.mock('axios', () => {
  const real = jest.requireActual('axios');
  return {
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), isAxiosError: real.default.isAxiosError },
  };
});

const http = axios as unknown as { get: jest.Mock; post: jest.Mock };

function cliente(valores: Record<string, string> = {}) {
  const config = {
    get: (clave: string) =>
      ({
        COMPLIANCE_AGENT_URL: 'https://agente.test/',
        COMPLIANCE_AGENT_KEY: 'secreta',
        ...valores,
      })[clave],
  };
  return new AgenteComplianceClient(config as never);
}

const DATOS_ANALISIS = {
  archivo: Buffer.from('x'),
  nombreArchivo: 'acta.docx',
  nomenclatura: 'CA-1',
  modalidad: 'CA_ACTO_UNICO_APERTURA_UNICA',
  tipoContratacion: 'BIENES',
  tipoDocumento: 'ACTA_INICIO',
};

describe('AgenteComplianceClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sin URL o sin clave no está configurado', () => {
    expect(cliente({ COMPLIANCE_AGENT_KEY: '' }).configurado).toBe(false);
    expect(cliente().configurado).toBe(true);
  });

  it('envía la clave en X-Agent-Key y quita la barra final de la URL', async () => {
    http.post.mockResolvedValue({ status: 200, data: { json_analista: {} }, headers: {} });
    await cliente().analizar(DATOS_ANALISIS);
    const [url, cuerpo, opciones] = http.post.mock.calls[0];
    expect(url).toBe('https://agente.test/api/analizar');
    expect(cuerpo).toBeInstanceOf(FormData);
    expect((cuerpo as FormData).get('tipo_documento')).toBe('ACTA_INICIO');
    expect(opciones.headers).toEqual({ 'X-Agent-Key': 'secreta' });
    expect(opciones.timeout).toBe(15 * 60 * 1000);
  });

  it('devuelve status, Retry-After y detail para que la cola decida', async () => {
    http.post.mockResolvedValue({
      status: 503,
      data: { detail: 'Instancia ocupada' },
      headers: { 'retry-after': '3' },
    });
    await expect(cliente().analizar(DATOS_ANALISIS)).resolves.toEqual({
      status: 503,
      retryAfterS: 3,
      detalle: 'Instancia ocupada',
    });
  });

  it('una conexión cortada se informa como status null', async () => {
    http.post.mockRejectedValue(new Error('socket hang up'));
    await expect(cliente().dictamen({} as never)).resolves.toEqual({ status: null });
  });

  it('el chat falla con 503 y el texto para el usuario', async () => {
    http.post.mockRejectedValue(new Error('timeout of 60000ms exceeded'));
    await expect(cliente().conversar({ mensaje: 'hola' } as never)).rejects.toThrow(
      new ServiceUnavailableException('No pude responder, intenta de nuevo.'),
    );
  });

  it('el chat descarta acciones que no son una lista', async () => {
    http.post.mockResolvedValue({ data: { respuesta: 'Listo', acciones: 'nada' } });
    await expect(cliente().conversar({} as never)).resolves.toEqual({
      respuesta: 'Listo',
      acciones: [],
    });
  });

  it('el catálogo se guarda en memoria', async () => {
    const agente = cliente();
    http.get.mockResolvedValueOnce({ data: { modalidades: [], tipos_contratacion: [] } });
    await agente.obtenerCatalogo();
    await agente.obtenerCatalogo();
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('sin clave no llama al agente', async () => {
    await expect(cliente({ COMPLIANCE_AGENT_KEY: '' }).obtenerCatalogo()).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(http.get).not.toHaveBeenCalled();
  });

  it('extraerDetalle toma detail o el cuerpo de Cloud Run', () => {
    expect(extraerDetalle({ detail: 'Archivo ilegible' })).toBe('Archivo ilegible');
    expect(extraerDetalle('<html>Service Unavailable</html>')).toBe(
      '<html>Service Unavailable</html>',
    );
    expect(extraerDetalle(null)).toBeNull();
  });
});
