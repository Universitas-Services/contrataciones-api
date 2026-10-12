# Guía Frontend — Documentos de Fase 3 (Gestión de Adjudicación)

**Audiencia:** Frank / equipo frontend
**Auth:** JWT Bearer en todos los endpoints
**Relacionado:** `docs/FRONTEND_GESTION_FASE3.md` (carácter, dictámenes y formulario del informe)

---

## 1. Resumen

| #   | Documento                                   | Tipo en BD              | Estado                   |
| --- | ------------------------------------------- | ----------------------- | ------------------------ |
| 1   | Informe de Recomendación (adjudicación)     | `INFORME_RECOMENDACION` | **Listo** (esta entrega) |
| 2   | Acta de Adjudicación                        | `ACTA_ADJUDICACION`     | **Listo**                |
| 3   | Notificaciones (adjudicado / no adjudicado) | `NOTIFICACION_*`        | Próximo                  |

> Si el expediente está **declarado desierto**, el mismo endpoint genera el Informe Desierto #1, #2 o #3 (ver `docs/FRONTEND_DOCUMENTOS_FASE2.md` §8).

---

## 2. Informe de Recomendación (adjudicación)

### 2.1 Requisitos para generar

| Condición                                                                                  | Si falta |
| ------------------------------------------------------------------------------------------ | -------- |
| Carácter definido (`PUT …/gestion-adjudicacion/caracter` → `TOTAL` o `PARCIAL`)            | **400**  |
| Formulario del informe guardado (`POST /evaluacion-fase3/informe/:expedienteId`)           | **400**  |
| **TOTAL:** dictamen TOTAL de la Primera Opción                                             | **400**  |
| **PARCIAL:** al menos un dictamen PARCIAL con `oferenteAdjudicadoProcedimientoAuAu = true` | **400**  |

El flag `gates.puedeGenerarInforme` de `GET …/gestion-adjudicacion` sigue siendo la guía para habilitar el botón.

### 2.2 Endpoints (los mismos de siempre)

| Acción     | Método | Ruta                                                                  |
| ---------- | ------ | --------------------------------------------------------------------- |
| Datos (QA) | `GET`  | `/generador-documentos/informe-recomendacion/{expedienteId}/datos`    |
| Generar    | `POST` | `/generador-documentos/generar/informe-recomendacion/{expedienteId}`  |
| Preview    | `GET`  | `/generador-documentos/preview/informe-recomendacion/{expedienteId}`  |
| Descargar  | `GET`  | `/generador-documentos/download/informe-recomendacion/{expedienteId}` |

Toast sugerido: `Informe de Recomendación generado exitosamente.`

### 2.3 De dónde sale cada parte del Word

| Sección                                                     | Fuente                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Cabecera, comisión, fechas                                  | Expediente, comisión, cronograma                                                              |
| 3. Oferentes del acto                                       | Ofertas presentadas                                                                           |
| 4. Requisitos preliminares (garantía / CRS)                 | Hub legal, Sobre 2 (`indVerificadoGarantia`, `indVerificadoCrs`)                              |
| 5. Calificación legal, financiera y técnica                 | Hub de evaluación de cada oferente                                                            |
| 6. Evaluación técnica / económica, promoción y totalización | Hub de evaluación (Evaluación y Promoción)                                                    |
| 7. Análisis de costos / actualización de presupuesto        | Carácter + formulario del informe                                                             |
| 8. Formalidades                                             | Formulario del informe                                                                        |
| 9. Determinación de opciones                                | TOTAL: ranking de prelación · PARCIAL: dictámenes adjudicados                                 |
| Renglones sin ofertas / desierto parcial                    | Formulario del informe (`existeItemsSinOfertas`)                                              |
| 10. Recomendación (PRIMERO, SEGUNDO…)                       | Dictámenes + prelación (Segunda/Tercera Opción)                                               |
| CRS, garantía de fiel cumplimiento, fianza laboral          | Fase 1 (porcentajes, retenciones) + monto adjudicado + **mano de obra ofertada** del dictamen |

### 2.4 Cálculos

- **Garantía de fiel cumplimiento** = monto adjudicado × 0,16 × % fiel cumplimiento (Fase 1).
- **Fianza laboral** = monto de mano de obra ofertado (dictamen) × % garantía laboral (Fase 1).
- En PARCIAL se calculan por cada empresa adjudicada.

### 2.5 Cambio en los dictámenes

Nuevo campo **`montoManoObraOfertadoAuAu`** en `PUT …/dictamenes/:evaluacionId/total` y `…/parcial` (ver `docs/FRONTEND_GESTION_FASE3.md` §2). Obligatorio cuando el pliego exige garantía laboral y el oferente se adjudica.

### 2.6 Flujo UI

```
1. Fijar carácter (TOTAL / PARCIAL)
2. Registrar dictámenes (con monto de mano de obra si aplica)
3. Guardar el formulario del informe
4. Cuando gates.puedeGenerarInforme = true → POST .../generar/informe-recomendacion/{expedienteId}
5. Preview / Download
```

---

## 3. Acta de Adjudicación (Acto Administrativo)

Lo firma la Máxima Autoridad (o su delegado). Su parte **RESUELVE** es la misma de la sección 10 del Informe de Recomendación: adjudicación TOTAL/PARCIAL, orden de prelación, renglones desiertos, CRS, garantías y numerales.

### 3.1 Requisitos para generar

| Condición                                                                                    | Si falta |
| -------------------------------------------------------------------------------------------- | -------- |
| Carácter, formulario del informe y dictamen(es) de adjudicación (igual que el Informe, §2.1) | **400**  |
| **Informe de Recomendación generado y vigente** (no `DESACTUALIZADO`)                        | **400**  |

Coincide con `gates.puedeGenerarActa` de `GET …/gestion-adjudicacion`.

> El Acta ya **no** usa la adjudicación antigua (`POST /expedientes/:id/adjudicacion`). Sin dictámenes de la Gestión de Fase 3 responde 400.

### 3.2 Endpoints

| Acción                 | Método | Ruta                                                              |
| ---------------------- | ------ | ----------------------------------------------------------------- |
| Datos (QA) — **nuevo** | `GET`  | `/generador-documentos/acta-adjudicacion/{expedienteId}/datos`    |
| Generar                | `POST` | `/generador-documentos/generar/acta-adjudicacion/{expedienteId}`  |
| Preview                | `GET`  | `/generador-documentos/preview/acta-adjudicacion/{expedienteId}`  |
| Descargar              | `GET`  | `/generador-documentos/download/acta-adjudicacion/{expedienteId}` |

Toast sugerido: `Acta de Adjudicación generada exitosamente.`

### 3.3 De dónde sale cada parte

| Parte                                                         | Fuente                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Quien suscribe (nombre, cédula, cargo, designación, leyes)    | Máxima Autoridad del expediente (o delegado, si firma como delegado) |
| Considerandos (fechas del llamado, acto de apertura, informe) | Cronograma + dirección fiscal del ente                               |
| RESUELVE                                                      | Igual que el Informe (dictámenes, prelación, informe, Fase 1)        |
| Fecha de firma                                                | Cronograma: fecha límite de adjudicación                             |

### 3.4 Flujo UI

```
1. Generar el Informe de Recomendación
2. Cuando gates.puedeGenerarActa = true → POST .../generar/acta-adjudicacion/{expedienteId}
3. Preview / Download
4. Si cambian dictámenes o el informe, regenerar primero el Informe y luego el Acta
```
