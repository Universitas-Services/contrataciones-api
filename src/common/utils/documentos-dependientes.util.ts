import type { Prisma, TipoDocumento } from '@prisma/client';

/** Documentos cuyo contenido sale de la evaluación y de la adjudicación. */
export const DOCUMENTOS_DE_ADJUDICACION: TipoDocumento[] = [
  'INFORME_RECOMENDACION',
  'ACTA_ADJUDICACION',
  'NOTIFICACION_ADJUDICADO',
  'NOTIFICACION_NO_ADJUDICADO',
];

/** Documentos que imprimen alguna fecha del cronograma. */
export const DOCUMENTOS_DEL_CRONOGRAMA: TipoDocumento[] = [
  'ACTA_INICIO',
  'LLAMADO_PARTICIPAR',
  'PLIEGO_CONDICIONES',
  'LISTA_COTEJO',
  'ACTA_RECEPCION',
  'ACTA_APERTURA',
  ...DOCUMENTOS_DE_ADJUDICACION,
  'NOTIFICACION_DECAIMIENTO',
  'NOTIFICACION_FIN_PROCEDIMIENTO',
  'CONTRATO',
];

/** Documentos que imprimen el presupuesto base o su total. */
export const DOCUMENTOS_DEL_PRESUPUESTO: TipoDocumento[] = [
  'ACTIVIDADES_PREVIAS',
  'ACTA_INICIO',
  'LLAMADO_PARTICIPAR',
  'PLIEGO_CONDICIONES',
  ...DOCUMENTOS_DE_ADJUDICACION,
];

type ClientePrisma = Pick<Prisma.TransactionClient, 'documentoGenerado' | 'pliegoGenerado'>;

/**
 * Marca desactualizados los documentos del expediente. Sin `tipos`, todos: es el caso
 * de los datos que salen en el membrete (objeto, nomenclatura, actores).
 */
export async function marcarDesactualizados(
  cliente: ClientePrisma,
  expedienteId: string,
  tipos?: TipoDocumento[],
): Promise<void> {
  await cliente.documentoGenerado.updateMany({
    where: {
      expedienteId,
      deletedAt: null,
      ...(tipos && { tipoDocumento: { in: tipos } }),
    },
    data: { estaDesactualizado: true },
  });
  // El pliego vive además en su propia tabla.
  if (!tipos || tipos.includes('PLIEGO_CONDICIONES')) {
    await cliente.pliegoGenerado.updateMany({
      where: { expedienteId, deletedAt: null },
      data: { estaDesactualizado: true },
    });
  }
}
