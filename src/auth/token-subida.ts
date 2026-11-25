/** Alcance del token corto que el frontend entrega al navegador para subir archivos. */
export const ALCANCE_SUBIDA = 'subida';
export const DURACION_TOKEN_SUBIDA_SEGUNDOS = 120;

/** Únicas rutas (método y patrón) que aceptan el token de subida. */
const RUTAS_DE_SUBIDA = new Set([
  'POST /proveedores',
  'PATCH /proveedores/:id',
  'POST /compliance/expedientes/:id/documentos',
  'POST /expedientes/:expedienteId/fase-preparatoria/especificaciones-tecnicas',
  'POST /expedientes/:expedienteId/fase-preparatoria/calificacion-legal/modelos',
]);

/** Un token con alcance solo sirve en sus rutas; el de sesión no lleva alcance. */
export function tokenPermitido(alcance: unknown, metodo: string, ruta: string): boolean {
  if (alcance === undefined) return true;
  return alcance === ALCANCE_SUBIDA && RUTAS_DE_SUBIDA.has(`${metodo} ${ruta}`);
}
