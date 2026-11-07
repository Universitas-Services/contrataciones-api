# Guía Frontend — Documentos de Fase 4

**Para:** Frank (frontend)
**Rama backend:** `documentos/fase4` (sale de `fase4`)
**Auth:** JWT Bearer en todos los endpoints.

> Esta guía cubre la **generación de documentos**. La lógica de contratos y decaimiento está en `docs/FASE4_FORMALIZACION_GESTION.md` y `docs/FASE4_AJUSTES_APLICADOS.md`.

---

## 1. Estado

| Documento                                | Plantilla                                              | Estado    |
| ---------------------------------------- | ------------------------------------------------------ | --------- |
| `CONTRATO`                               | `contrato-fase4-template.docx`                         | **Listo** |
| `CERTIFICADO_INCUMPLIMIENTO`             | `certificado-incumplimiento-template.docx`             | **Listo** |
| `RESOLUCION_DECAIMIENTO`                 | `resolucion-decaimiento-template.docx`                 | Pendiente |
| `NOTIFICACION_DECAIMIENTO`               | `notificacion-decaimiento-template.docx`               | Pendiente |
| `NOTIFICACION_ADJUDICACION_SUBSIGUIENTE` | `notificacion-adjudicacion-subsiguiente-template.docx` | Pendiente |
| `NOTIFICACION_FIN_PROCEDIMIENTO`         | `notificacion-fin-procedimiento-template.docx`         | Pendiente |

---

## 2. Contrato

**Los endpoints no cambian.** Con la plantilla en su lugar, `POST …/generar` ya produce el `.docx` y `documentoId` deja de venir en `null`.

Base: `/formalizacion-fase4/expediente/{expedienteId}`

| Acción           | Método | Ruta                                 |
| ---------------- | ------ | ------------------------------------ |
| Ver contrato     | `GET`  | `/contratos/{evaluacionId}`          |
| Guardar borrador | `PUT`  | `/contratos/{evaluacionId}`          |
| Generar          | `POST` | `/contratos/{evaluacionId}/generar`  |
| Vista previa     | `GET`  | `/documentos/{documentoId}/preview`  |
| Descargar        | `GET`  | `/documentos/{documentoId}/download` |

### 2.1 Qué cambió en lo que devuelve la API

1. **Los montos en cifras ya no traen "Bs."** Las cláusulas escriben `(Bs. [MONTO CONTRATO EN NUMEROS])`, así que antes salía "Bs. Bs. 1.000,00".
   - `monto_contrato_numeros_au_au`: `"1.000.000,00"` (antes `"Bs. 1.000.000,00"`).
   - Igual `monto_garantia_fiel_cumplimiento_numeros_au_au` y `monto_crs_numeros_au_au`.
   - Si en pantalla muestras `tokens.*_numeros_au_au` sueltos, agrega tú el "Bs.".
2. **`monto_garantia_fiel_cumplimiento_letras_au_au` ya no trae "BOLÍVARES"**, porque la cláusula lo escribe después.
3. **Garantía de fiel cumplimiento:** ahora es monto × 0,16 × %, igual que el Informe y el Acta de Fase 3.
4. **Las marcas con llaves ya se resuelven.** Las cláusulas de Fase 1 traen marcas como `{desc_objeto_contratacion_au_au}` o `{nom_unidad_usuaria}`. `GET …/contratos/{evaluacionId}` ahora las devuelve como píldoras con su valor.
5. **Los bloques de la cláusula de garantías se expanden solos** según lo marcado en Fase 1: retención de fiel cumplimiento, anticipo, garantía laboral y póliza. Llegan al editor como texto normal; si no aplican, no aparecen.
6. **Catálogo:** `GET /biblioteca/tokens` suma 9 datos:

| `id`                                       | Etiqueta                            |
| ------------------------------------------ | ----------------------------------- |
| `nom_unidad_usuaria_au_au`                 | UNIDAD USUARIA                      |
| `modalidad_crs_au_au`                      | MODALIDAD CRS                       |
| `unidad_resp_cumplimiento_crs_au_au`       | UNIDAD RESPONSABLE CRS              |
| `porcentaje_garantia_laboral_au_au`        | PORCENTAJE DE GARANTIA LABORAL      |
| `porcentaje_responsabilidad_civil_au_au`   | PORCENTAJE DE RESPONSABILIDAD CIVIL |
| `monto_responsabilidad_civil_bs_au_au`     | MONTO RESPONSABILIDAD CIVIL NUMEROS |
| `monto_responsabilidad_civil_letras_au_au` | MONTO RESPONSABILIDAD CIVIL LETRAS  |
| `monto_fianza_laboral_numeros_au_au`       | MONTO FIANZA LABORAL NUMEROS        |
| `monto_fianza_laboral_letras_au_au`        | MONTO FIANZA LABORAL LETRAS         |

### 2.2 Cómo sale el Word

- **Cláusulas:** todas las que lleguen en `clauses`, ordenadas por `order`, numeradas en ordinal: `CLÁUSULA PRIMERA: …`, `CLÁUSULA VIGÉSIMA SEGUNDA: …`. Las personalizadas van en la misma lista.
- **Quitar una cláusula:** no enviarla en `clauses`. La numeración se recalcula.
- **Datos sin fuente** (multa diaria, fechas de vigencia…): si el usuario no escribe nada en la píldora, salen como línea `________`.
- **Fecha del contrato:** la `fechaLimiteFirmaContrato` del cronograma. Quien asumió por decaimiento lleva la fecha en que se genera.
- **Firma:** la Máxima Autoridad, o su delegado si el expediente firma como delegado.
- El texto "CONTRATO MARCO" del encabezado va siempre.

---

## 3. Certificado de incumplimiento

**No cambia nada en el frontend.** Al guardar el certificado (`PUT …/decaimientos/activo/certificado`) el Word se genera solo. Su `documentoId` viene en el estado del ciclo; con él funcionan `…/documentos/{documentoId}/preview` y `…/download`.

Lo firma la Secretaria de la Comisión y va dirigido a la Máxima Autoridad (o su delegado).

La sección "Recomendación" cambia según la decisión del ciclo y el carácter:

| Decisión       | TOTAL                                                      | PARCIAL                                                                       |
| -------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `SUBSIGUIENTE` | Adjudicación subsiguiente total, con `montoReadjudicadoBs` | Adjudicación subsiguiente parcial, con alcance y `montoReadjudicadoParcialBs` |
| `DESIERTO`     | Declarar desierto + modalidad degradada                    | Desierto parcial con `renglonesAfectadosDecaimiento` + modalidad degradada    |

Campos del certificado que salen en el Word: `fechaNotificacionAdjudicacionIncumplidor` y `fechaCertificacionIncumplimiento`. Los vencimientos los calcula el backend.

> La `causalDecaimiento` se guarda pero no se imprime: el texto del certificado es fijo.
