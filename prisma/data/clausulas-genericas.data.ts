/**
 * Datos semilla de cláusulas genéricas (tb_clausulas_genericas_ente).
 * Cada entrada es título + texto sugerido para precarga del editor (UNIVERSITAS).
 * TARJETA 23 (cláusula custom vacía) no se siembra.
 */
export const CLAUSULAS_GENERICAS_SEED: Array<{ titulo: string; cuerpo: string }> = [
  {
    titulo: 'OBJETO DEL CONTRATO',
    cuerpo:
      'El objeto del presente contrato es la {desc_objeto_contratacion_au_au}, de conformidad con las condiciones, especificaciones técnicas y alcances definidos en el Pliego de Condiciones y en la oferta presentada por “LA CONTRATISTA” en el procedimiento competitivo N° {cod_nomenclatura_proceso_au_au}, y los anexos que más adelante se identifican y que forman parte integrante de este contrato.',
  },
  {
    titulo: 'DOCUMENTOS CONTRACTUALES',
    cuerpo: `Forman parte integrante de este Contrato, siendo de obligatorio cumplimiento los siguientes Anexos que se mencionan a continuación:
- Anexo A: Oferta y Presupuesto detallado presentado por “LA CONTRATISTA”.
- Anexo B: Seguros y Garantías.
- Anexo C: Pliego de Condiciones.`,
  },
  {
    titulo: 'MONTO DEL CONTRATO Y CRÉDITO PRESUPUESTARIO',
    cuerpo: `El monto total del presente contrato es la cantidad de [MONTO CONTRATO EN LETRAS] (Bs. [MONTO CONTRATO EN NUMEROS]) (incluyendo el Impuesto al Valor Agregado (IVA)), los cuales serán imputados a la(s) siguientes Partida(s) Presupuestaria(s) N° [PARTIDAS PRESUPUESTARIAS]. De conformidad con lo establecido en el Artículo 74 de la Ley de Contrataciones Públicas y el Artículo 24, literal "d" de las Normas de Control Interno de la SUNAI, se hace constar que el límite financiero de este contrato se encuentra totalmente respaldado por la disponibilidad presupuestaria debidamente certificada para el presente ejercicio fiscal.
Queda expresamente entendido entre “LAS PARTES” que el monto total aquí estipulado constituye un límite máximo presupuestario y no genera una obligación de pago inmediata para “EL CONTRATANTE”, de modo que la deuda particular nacerá únicamente con la emisión, recepción y ejecución conforme de cada Orden de Compra o Servicio, garantizando así la trazabilidad financiera del gasto y blindando la actuación de la Máxima Autoridad bajo lo previsto en el Artículo 74 de la LCP y el Artículo 24, literal 'd', de las Normas de Control Interno (SUNAI); en consecuencia, la ejecución efectiva de los recursos estará sujeta a la disponibilidad certificada del presente ejercicio fiscal y, tratándose de contratos que abarquen más de un ejercicio, supeditada estrictamente a la obtención de los correspondientes créditos presupuestarios en las leyes de presupuesto de cada anualidad futura involucrada, sin que la falta de disponibilidad en períodos subsiguientes genere derechos resarcitorios para “LA CONTRATISTA”.`,
  },
  {
    titulo: 'PLAZO DE EJECUCIÓN',
    cuerpo:
      '“LA CONTRATISTA” se compromete a iniciar e implementar la ejecución total del objeto contractual en un plazo de: [PLAZO EJECUCION DIAS] días (hábiles/continuos). Este plazo se contará a partir de [EVENTO INICIO PLAZO] (fecha que sea señalada de manera formal mediante la suscripción del Acta de Inicio correspondiente o recepción efectiva de la Orden de Compra o Servicio).',
  },
  {
    titulo: 'CONDICIONES DE LA EJECUCIÓN PRESUPUESTARIA',
    cuerpo: `“LAS PARTES” entienden y aceptan que el presente Contrato se suscribe y su ejecución se inicia con base en la disponibilidad presupuestaria existente para el presente ejercicio fiscal y en consecuencia:
- Ejecución sujeta a Disponibilidad: La ejecución de las porciones del objeto contractual cuyo financiamiento corresponda a futuros ejercicios fiscales, estará sujeta a la obtención de los créditos presupuestarios correspondientes por parte de “EL CONTRATANTE”.
- Inexistencia de Obligación: La no obtención de la disponibilidad presupuestaria para ejercicios futuros no generará obligación de pago para “EL CONTRATANTE” ni derecho a indemnización para “LA CONTRATISTA” por la porción no ejecutada del contrato.
- Formalización de la Continuidad: La continuidad de la ejecución en ejercicios fiscales subsiguientes se formalizará mediante la suscripción de las adendas contractuales respectivas, una vez se cuente con la debida disponibilidad presupuestaria.`,
  },
  {
    titulo: 'CONDICIONES Y MODO DE PAGO',
    cuerpo: `Los pagos a “LA CONTRATISTA” se realizarán de forma progresiva contra la ejecución y recepción conforme del objeto contractual, según el siguiente procedimiento:
1.- Soporte de la Ejecución: “LA CONTRATISTA” deberá presentar ante {nom_ente_contratante}, para su revisión y validación, el soporte que acredite la porción del contrato ejecutada, el cual corresponderá a: [TIPO SOPORTE EJECUCION] (Valuaciones de obra, Actas de entrega, o Informes de actividades según aplique).
2.- Criterios de Aceptación: La conformidad de dicho soporte estará sujeta al cumplimiento de los siguientes criterios: [CRITERIOS DE ACEPTACION SOPORTE].
3.- Consignación de factura: Una vez recibida la conformidad, “LA CONTRATISTA” tendrá un plazo de [PLAZO CONSIGNACION FACTURA] días hábiles para consignar la factura original, la cual deberá cumplir con las exigencias fiscales dictadas por el SENIAT.
4.- Trámite de Pago: Una vez recibido el soporte con la debida conformidad de la Unidad Supervisora, se dará curso al trámite administrativo para el respectivo pago.
5.- Desembolso: “EL CONTRATANTE” procederá al pago de la factura dentro de los [PLAZO CALENDARIO DESEMBOLSO] días calendario a partir de la fecha de recepción conforme de la factura original en la unidad administrativa correspondiente, en estricto acatamiento del Artículo 36 de las Normas de Control Interno de la SUNAI.`,
  },
  {
    titulo: 'SUPERVISIÓN DEL CONTRATO',
    cuerpo:
      '“EL CONTRATANTE” designa la administración del presente contrato a cargo de la {nom_unidad_usuaria}, la cual actuará como Unidad Usuaria y velará por la correcta ejecución de las obligaciones asumidas por el contratista, sin perjuicio de las competencias técnicas del Supervisor o Inspector responsable de la ejecución designado al efecto.',
  },
  {
    titulo: 'GARANTÍAS CONTRACTUALES',
    cuerpo: `“LA CONTRATISTA” se obliga a constituir, presentar y mantener vigentes las siguientes garantías:

a) GARANTÍA DE FIEL CUMPLIMIENTO: A los efectos de asegurar el fiel, cabal y oportuno cumplimiento de todas las obligaciones contractuales derivadas de {desc_objeto_contratacion_au_au}, “LA CONTRATISTA” deberá constituir fianza emitida por una Institución de Seguros o Bancaria debidamente autorizada por el órgano rector nacional, Esta Garantía deberá constituirse por la cantidad equivalente al {porcentaje_fiel_cumplimiento_au_au} del monto contractual incluyendo el Impuesto al Valor Agregado, ascendiendo a la cantidad de [MONTO GARANTIA FIEL CUMPLIMIENTO LETRAS] Bolívares (Bs. [MONTO GARANTIA FIEL CUMPLIMIENTO NUMEROS]), Artículo 123 de la LCP, {retencion_fiel_cumplimiento_au_au}.

{modelo_anticipo_contrato_au_au}

{modelo_garantia_laboral_au_au}

{modelo_poliza_responsabilidad_civil_au_au}`,
  },
  {
    titulo: 'COMPROMISO DE RESPONSABILIDAD SOCIAL',
    cuerpo:
      '“LA CONTRATISTA” se compromete a cumplir formalmente con el Compromiso de Responsabilidad Social que sea determinado por “EL CONTRATANTE”, equivalente al {porcentaje_responsabilidad_social_au_au}% del monto total de su propuesta económica (sin incluir el IVA). El mencionado compromiso social consistirá en {modalidad_crs_au_au}, debiendo ejecutarse, culminarse e informarse de manera conforme antes del cierre administrativo del contrato. El seguimiento técnico-social de esta obligación será ejercido por {unidad_resp_cumplimiento_crs_au_au}.',
  },
  {
    titulo: 'PENALIZACIÓN POR RETRASO E INCUMPLIMIENTO',
    cuerpo:
      'En caso de retrasos o demoras en la ejecución de las obligaciones contractuales por causas imputables a “LA CONTRATISTA”, se aplicará una multa diaria equivalente al [PORCENTAJE MULTA DIARIA]% calculada sobre [BASE CALCULO MULTA] por cada día calendario de retraso. Previo a la imposición física de la sanción, “EL CONTRATANTE” notificará por escrito a “LA CONTRATISTA” a los fines de que regularice o subsane la situación en un plazo no mayor de [PLAZO SUBSANACION INCUMPLIMIENTO] días hábiles. Si las multas acumuladas alcanzan el [LIMITACION PORCENTAJE RESCISION] % del valor contractual total (sin IVA), “EL CONTRATANTE” iniciará de forma obligatoria el procedimiento administrativo para la rescisión unilateral del contrato por incumplimiento, de acuerdo con el artículo 33 de las Normas de Control Interno dictadas por la SUNAI.',
  },
  {
    titulo: 'MECANISMO DE AJUSTE DE PRECIOS',
    cuerpo:
      '“LAS PARTES” convienen expresamente que para el reconocimiento de variaciones de precios que afecten realmente el valor de la presente contratación, se aplicará el siguiente mecanismo: [FORMULA ESCALATORIA O METODOLOGIA] (Fórmulas escalatorias con base en los indicadores publicados por el BCV o Comprobación Directa de Costos), conforme a lo estipulado en el pliego de condiciones y el Artículo 20 de las Normas SUNAI.',
  },
  {
    titulo: 'PROHIBICIÓN DE CESIÓN DEL CONTRATO',
    cuerpo:
      'Queda expresamente prohibida la cesión o traspaso total o parcial de este contrato por parte de “LA CONTRATISTA”, sin contar previamente con la autorización formal, expresa y emitida por escrito de “EL CONTRATANTE”, de conformidad con el artículo 120 de la Ley de Contrataciones Públicas. Cualquier pacto o convenio en contrario será considerado nulo y sin validez jurídica.',
  },
  {
    titulo: 'EVALUACIÓN DE DESEMPEÑO',
    cuerpo:
      'Al finalizar la ejecución del contrato, “EL CONTRATANTE” realizará una evaluación del desempeño de “LA CONTRATISTA”, conforme a lo exigido en el Artículo 40 de las Normas dictadas por la SUNAI. Esta evaluación medirá de manera cuantitativa los siguientes factores: [FACTORES EVALUACION CUANTITATIVOS]. El dictamen obtenido le será notificado formalmente a “LA CONTRATISTA” y remitido en formato digital ante el Servicio Nacional de Contratistas (SNC) a los fines de garantizar el debido proceso.',
  },
  {
    titulo: 'GARANTÍA POST-EJECUCIÓN',
    cuerpo:
      '“LA CONTRATISTA” se obliga de manera formal a garantizar la calidad y el correcto funcionamiento del objeto contractual por un lapso mínimo de [LAPSO MINIMO GARANTIA POST] días continuos, contados a partir de la firma del Acta de Recepción Definitiva. Durante este lapso de garantía, “LA CONTRATISTA” subsanará, reparará o sustituirá a su entero costo cualquier defecto o vicio oculto detectado.',
  },
  {
    titulo: 'EJECUCIÓN DEL CONTRATO',
    cuerpo:
      'La ejecución del presente Contrato se materializará de manera formal y exclusiva a través de la emisión y notificación sucesiva de Órdenes de Compra (para bienes) u Órdenes de Servicio (para servicios u obras). Será condición indispensable para la validez de cada orden que se incorpore la referencia inequívoca a este Contrato N° {cod_nomenclatura_proceso_au_au}, de estricta conformidad con lo dictado en el Artículo 11 de las Normas de Control Interno de la SUNAI.',
  },
  {
    titulo: 'RESCISIÓN DEL CONTRATO',
    cuerpo: `El presente contrato podrá terminar por las siguientes causas:
- Por Cumplimiento del Objeto: Una vez que “LA CONTRATISTA” haya ejecutado la totalidad de las obligaciones a su cargo a entera satisfacción de “EL CONTRATANTE”.
- Por Mutuo Acuerdo de “LAS PARTES”: Cuando circunstancias de interés público o de fuerza mayor así lo justifiquen, “LAS PARTES” podrán convenir en la terminación anticipada del contrato, suscribiendo el acta de finiquito correspondiente.
- Por Rescisión Unilateral por Causa Imputable a “LA CONTRATISTA”: “EL CONTRATANTE” podrá rescindir unilateralmente el contrato, previa sustanciación del debido procedimiento administrativo que garantice el derecho a la defensa, si “LA CONTRATISTA” incurre en alguna de las causales previstas en el artículo 155 de la LCP.
- Por Rescisión Unilateral por Causa No Imputable a “LA CONTRATISTA”: “EL CONTRATANTE” podrá rescindir el contrato por razones de interés público, en cuyo caso procederá la indemnización correspondiente de conformidad con los Artículos 152 y 153 de la LCP.`,
  },
  {
    titulo: 'MODIFICACIONES CONTRACTUALES',
    cuerpo:
      'Cualquier modificación a las condiciones establecidas en este contrato sólo podrá realizarse por las causales previstas en la Ley de Contrataciones Públicas, tales como la alteración del presupuesto o la necesidad de prórrogas justificadas. Toda modificación deberá ser solicitada por escrito, debidamente justificada por la parte interesada, y aprobada mediante un acto administrativo formal suscrito por la máxima autoridad de “EL CONTRATANTE”, en cumplimiento del art. 32 de las Normas SUNAI. Ninguna modificación tendrá efecto si no se formaliza a través de la correspondiente adenda a este contrato.',
  },
  {
    titulo: 'INALTERABILIDAD DE LAS CONDICIONES',
    cuerpo:
      '“LAS PARTES” declaran que las condiciones, precios, especificaciones y plazos establecidos en el presente contrato son fiel reflejo de lo dispuesto en el Pliego de Condiciones y en la oferta presentada por “LA CONTRATISTA”, los cuales no podrán ser alterados salvo por las causales y mediante los procedimientos legalmente establecidos, en cumplimiento del artículo 119 de la Ley de Contrataciones Públicas.',
  },
  {
    titulo: 'FINIQUITO DEL CONTRATO',
    cuerpo: `Una vez culminada la ejecución total del objeto del contrato y efectuada la recepción definitiva a satisfacción de “EL CONTRATANTE”, la unidad administrativa financiera procederá a elaborar el Finiquito Contable correspondiente, de conformidad con lo establecido en el art. 38 de las Normas SUNAI aplicables.
Dicho finiquito tendrá como propósito:
- Realizar una conciliación final entre el monto total del contrato, los pagos efectuados, los anticipos amortizados, las retenciones aplicadas y cualquier otra deducción o crédito que hubiere tenido lugar.
- Determinar la existencia de saldos pendientes de pago a favor de “LA CONTRATISTA” o de montos a ser reintegrados a “EL CONTRATANTE”
- Servir como base para la liberación de la Garantía de Fiel Cumplimiento y cualquier otra retención existente, una vez que todas las cuentas estén debidamente saldadas.`,
  },
  {
    titulo: 'CIERRE ADMINISTRATIVO DEL CONTRATO',
    cuerpo: `Una vez culminada la ejecución del objeto contractual y efectuada la recepción definitiva, se dará inicio al Cierre Administrativo del Contrato, tal como se indica en el art. 39 de las Normas SUNAI, el cual comprenderá las siguientes etapas:
- Recepción Definitiva: Información técnica preparada por la Unidad Usuaria y el Supervisor que certificarán el cumplimiento de lo contratado (recepción definitiva del bien, servicio u obra).
- Elaboración del Finiquito: Se procederá con la elaboración del Finiquito Contable según lo estipulado en la Cláusula Décima Octava.
- Evaluación de Desempeño: Se aplicará lo dispuesto en la Cláusula Décima Tercera.
- Liberación de Garantías: Cumplidos los pasos anteriores y saldadas todas las obligaciones, se procederá a la liberación de la Garantía de Fiel Cumplimiento y cualquier otra retención existente.
- Informe favorable del área a quien corresponde la asesoría jurídica de “EL CONTRATANTE”; se exceptúa este requisito cuando se trate de cierre administrativo de órdenes de compra/ servicio utilizadas como contrato.
- Se debe generar un documento que deberá estar firmado por el representante legal del “LA CONTRATISTA” y la Máxima autoridad de “EL CONTRATANTE” o quienes estén delegados para tal fin.
- En caso de imposibilidad de lograr la participación y firma de “LA CONTRATISTA”, se procederá al cierre unilateral, dejando constancia de la situación.`,
  },
  {
    titulo: 'DURACIÓN Y VIGENCIA DEL CONTRATO',
    cuerpo:
      'Este Contrato tiene una vigencia formal que inicia a partir de [FECHA INICIO VIGENCIA], hasta [FECHA FIN VIGENCIA], ambas fechas inclusive. “LA CONTRATISTA” se compromete a cumplir fielmente los plazos establecidos, ejecutando el presente contrato de acuerdo con las condiciones exigidas en el pliego de condiciones y en la oferta técnica-económica presentada. La duración del contrato se extenderá conforme a lo descrito anteriormente y a la disponibilidad presupuestaria.',
  },
  {
    titulo: 'DOMICILIO ESPECIAL Y RESOLUCIÓN DE CONTROVERSIAS',
    cuerpo:
      'Para todos los efectos derivados del presente instrumento contractual, “LAS PARTES” eligen como domicilio especial, único y excluyente la ciudad de [CIUDAD DOMICILIO ESPECIAL], a cuyos tribunales declaran someterse de forma expresa.',
  },
];
