/**
 * Redacción de los recaudos legales que admiten declaración jurada sustitutiva.
 * La comparten el pliego y el informe de recomendación, para que digan lo mismo.
 */

export const TEXTO_RIF = '- Copia del Registro de Información Fiscal (R.I.F.).';
export const TEXTO_RIF_SUSTITUTO =
  '- Copia del Registro de Información Fiscal (R.I.F.) o declaración jurada de Registro de Información Fiscal (R.I.F.) (Ver Modelo en Anexo III) en caso de que el proponente acredite que el documento se encuentra en proceso de actualización o trámite ante el SENIAT.';
export const TEXTO_RNC =
  '- Certificado de Inscripción en el Registro Nacional de Contratistas, con el respectivo reporte de calificación o Planilla Resumen.';
export const TEXTO_RNC_SUSTITUTO =
  "- Certificado de Inscripción en el Registro Nacional de Contratistas, con el respectivo reporte de calificación o Planilla Resumen o Declaración Jurada de Registro en Trámite (R.N.C.) (Ver Modelo en Anexo III); no obstante, el adjudicado quedará obligado a consignar el certificado en status 'Calificado' vigente como condición indispensable para la formalización del contrato, de conformidad con el Artículo 48 de la LCP.";
export const TEXTO_DESEMPENO =
  '-Informe de Evaluación de desempeño en Contrataciones de los últimos dos (2) años, para determinar el Nivel General de Evaluación del Contratista en los últimos veinticuatro (24) meses según el Servicio Nacional de Contratista (SNC), en caso de haber contratado con el Estado.';
export const TEXTO_DESEMPENO_SUSTITUTO =
  '-Informe de Evaluación de desempeño en Contrataciones: Su ausencia en la oferta constituye una omisión no sustancial, siempre que se consigne la Declaración Jurada de Evaluación de Desempeño (Ver Anexo III). Asimismo, en aquellos casos donde el oferente no posea historial previo de contratación con el sector público, deberá adjuntar al menos dos (02) referencias comerciales de empresas privadas como medio alternativo para validar su capacidad técnica, de conformidad con lo previsto en los Artículos 51 de la LCP y 61 de su Reglamento';

/** Texto de cada recaudo según si se permite la declaración jurada sustitutiva. */
export function textosRecaudosConSustituto(sustitutos: Record<string, unknown>) {
  return {
    texto_mod_copia_rif_vigente_au_au: sustitutos.sustitutoDjRifVigenteAuAu
      ? TEXTO_RIF_SUSTITUTO
      : TEXTO_RIF,
    texto_mod_certificado_rnc_au_au: sustitutos.sustitutoDjCertificadoRncAuAu
      ? TEXTO_RNC_SUSTITUTO
      : TEXTO_RNC,
    texto_mod_evaluacion_desempeno_au_au: sustitutos.sustitutoDjEvalDesempenoAuAu
      ? TEXTO_DESEMPENO_SUSTITUTO
      : TEXTO_DESEMPENO,
  };
}
