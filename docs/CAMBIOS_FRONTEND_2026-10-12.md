# Cambios para el frontend — 12 de octubre de 2026

**Para:** Frank (frontend)
**Rama backend:** `documentos/fase3`
**Auth:** todos los endpoints requieren JWT Bearer.

> Este documento reúne **solo lo que cambió hoy**. Se puede leer por sí solo; no hace falta volver a abrir las guías anteriores.

---

## Resumen

| #   | Cambio                                                                | ¿Qué tiene que hacer el frontend?                                                            |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Hub de Calificación Legal: **observaciones** de garantía y CRS        | Agregar dos campos de texto opcionales en el Sobre 2                                         |
| 2   | Dictámenes TOTAL y PARCIAL: **monto de mano de obra ofertado**        | Agregar un campo numérico al formulario del dictamen                                         |
| 3   | Dictamen TOTAL: **causa de no adjudicación** (endpoint nuevo)         | Pedir la causa a cada calificado que no es Primera Opción                                    |
| 4   | **Informe de Recomendación** (adjudicación) con prototipo nuevo       | Mismos endpoints; revisar cuándo habilitar el botón                                          |
| 5   | **Acta de Adjudicación** con prototipo nuevo                          | Mismos endpoints + uno nuevo de datos; nuevo requisito                                       |
| 6   | **Notificaciones** (adjudicado y no adjudicado) con prototipos nuevos | Mismos endpoints + uno nuevo de datos; ahora también los descalificados reciben notificación |

Orden en el que se usan en la Gestión de Fase 3:

```
Carácter (TOTAL/PARCIAL) → Dictámenes (+ causas en TOTAL) → Formulario del informe
   → Informe de Recomendación → Acta de Adjudicación → Notificaciones
```

---

## 1. Hub legal: observaciones de garantía y CRS

En el **Sobre 2** de la Calificación Legal, las preguntas de verificación de **garantía de mantenimiento de la oferta** y de **compromiso de responsabilidad social** ahora tienen **observación**, igual que el resto de los recaudos.

```http
PATCH /evaluacion-fase3/{evaluacionId}/hub/legal
```

Dentro de `form` se agregan dos campos:

```json
{
  "action": "draft",
  "form": {
    "items": { "...": { "consignado": "SI", "observacion": "..." } },
    "justificacion": "...",
    "indVerificadoGarantia": true,
    "indVerificadoCrs": false,
    "obsVerificadoGarantia": "Fianza emitida por Seguros X",
    "obsVerificadoCrs": null
  }
}
```

| Campo                   | Tipo   | Regla                             |
| ----------------------- | ------ | --------------------------------- |
| `obsVerificadoGarantia` | string | Opcional. Máx. **500** caracteres |
| `obsVerificadoCrs`      | string | Opcional. Máx. **500** caracteres |

- Se guardan en **borrador** y al **confirmar**.
- El `GET /evaluacion-fase3/{evaluacionId}/hub` las devuelve en `legal.form` (vacías → `null`).
- Si superan 500 caracteres, el `PATCH` responde **422** con el mensaje _"La observación de la verificación de garantía/CRS supera los 500 caracteres."_.
- No cambian si el oferente califica y **no se imprimen** en ningún documento.

**UI sugerida:** botón "Observación" al lado de cada una de las dos preguntas Sí/No, igual que en los recaudos.

---

## 2. Dictámenes: monto de mano de obra ofertado

Es la base de la **Fianza Laboral** que sale en el Informe, el Acta y la Notificación de adjudicación.

```http
PUT /evaluacion-fase3/expediente/{expedienteId}/dictamenes/{evaluacionId}/total
PUT /evaluacion-fase3/expediente/{expedienteId}/dictamenes/{evaluacionId}/parcial
```

Campo nuevo en el body de los dos:

| Campo                       | Tipo             | Regla                                                                                       |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `montoManoObraOfertadoAuAu` | **number** (Bs.) | ≥ 0. **Obligatorio** si el pliego (Fase 1) exige garantía laboral y el oferente se adjudica |

- **TOTAL:** se envía junto con partidas, monto y plazo.
- **PARCIAL:** solo cuando `oferenteAdjudicadoProcedimientoAuAu = true`.
- Si falta cuando es obligatorio → **400**: _"Debe indicar el monto de mano de obra ofertado (montoManoObraOfertadoAuAu): el pliego exige garantía laboral."_

> En la documentación aparece como "Tipo de dato: Text", pero el backend lo recibe como **número** (se usa para calcular la fianza). Enviarlo sin formato: `200000.5`, no `"200.000,50"`.

Ejemplo TOTAL:

```json
{
  "partidasAdjudicadasTotalAuAu": "4.02.01",
  "montoAdjudicadoTotalAuAu": 1000000,
  "plazoEjecucionOfertaGanadoraAuAu": 30,
  "montoManoObraOfertadoAuAu": 200000
}
```

---

## 3. Dictamen TOTAL: causa de no adjudicación (endpoint nuevo)

En adjudicación **TOTAL**, cada calificado que **no** es la Primera Opción necesita una **causa de no adjudicación**. Es la "motivación individual" que se imprime en su Notificación a no adjudicados. En PARCIAL esto ya existía dentro del dictamen parcial (`causaNoAdjudicadoAuAu`).

```http
PUT /evaluacion-fase3/expediente/{expedienteId}/dictamenes/{evaluacionId}/no-adjudicado
```

```json
{ "causaNoAdjudicadoAuAu": "Su oferta quedó como Segunda Opción con 90 puntos." }
```

| Respuesta | Cuándo                                                           |
| --------- | ---------------------------------------------------------------- |
| **200**   | Guardado (se puede volver a llamar para editar)                  |
| **400**   | El carácter no es TOTAL                                          |
| **400**   | El oferente es la Primera Opción (esa se adjudica con `…/total`) |
| **400**   | La causa viene vacía                                             |

### Cambios en `GET /evaluacion-fase3/expediente/{expedienteId}/gestion-adjudicacion`

- Cada oferente trae un campo nuevo: **`requiereCausaNoAdjudicado`** → `true` cuando hay que mostrarle el formulario de causa (TOTAL y no es Primera Opción).
- **`gates.dictamenesCompletos` en TOTAL** ahora es `true` solo cuando:
  - la Primera Opción tiene su dictamen TOTAL, **y**
  - todos los demás calificados tienen su causa registrada.

  Como `puedeGenerarInforme` depende de `dictamenesCompletos`, el botón del Informe no se habilita hasta registrar todas las causas.

- El dictamen de un no adjudicado en TOTAL aparece en `oferentes[].dictamen` con `tipoDictamen: "TOTAL"`, `oferenteAdjudicadoProcedimiento: false` y `causaNoAdjudicado`.

**UI sugerida (TOTAL):**

- Primera Opción → formulario de adjudicación (partidas, monto, plazo, mano de obra).
- Resto de calificados (`requiereCausaNoAdjudicado = true`) → un campo de texto "Causa de no adjudicación" + Guardar.

---

## 4. Informe de Recomendación (adjudicación)

Usa el prototipo nuevo de documentación. **Los endpoints no cambian:**

| Acción     | Método | Ruta                                                                  |
| ---------- | ------ | --------------------------------------------------------------------- |
| Datos (QA) | `GET`  | `/generador-documentos/informe-recomendacion/{expedienteId}/datos`    |
| Generar    | `POST` | `/generador-documentos/generar/informe-recomendacion/{expedienteId}`  |
| Preview    | `GET`  | `/generador-documentos/preview/informe-recomendacion/{expedienteId}`  |
| Descargar  | `GET`  | `/generador-documentos/download/informe-recomendacion/{expedienteId}` |

> Si el expediente está **declarado desierto**, este mismo endpoint genera el Informe Desierto #1, #2 o #3 según la causal (eso no cambió).

### Requisitos para generar (si falta alguno → 400 con mensaje)

1. Carácter definido (TOTAL o PARCIAL).
2. **Formulario del informe guardado** (`POST /evaluacion-fase3/informe/{expedienteId}`).
3. TOTAL: dictamen de la Primera Opción. PARCIAL: al menos un dictamen adjudicado.

> **Ojo:** `gates.puedeGenerarInforme` no revisa el punto 2. Habilitar el botón cuando `puedeGenerarInforme = true` **y** el formulario del informe ya esté guardado (`gates.informePersistido = true`).

### Qué toma el documento

- Secciones 1–6 (oferentes, requisitos preliminares, calificación legal/financiera/técnica, evaluación, promoción, totalización): del **hub de evaluación**.
- Secciones 7–10 (costos, formalidades, determinación de opciones, recomendación, renglones desiertos, CRS, garantías): de **carácter + dictámenes + formulario del informe + Fase 1**.
- Garantía de fiel cumplimiento = monto adjudicado × 0,16 × % fiel cumplimiento.
- Fianza laboral = **monto de mano de obra** (punto 2) × % garantía laboral.

---

## 5. Acta de Adjudicación

Usa el prototipo nuevo. La firma la Máxima Autoridad (o su delegado) y su RESUELVE es el mismo del Informe.

| Acción                 | Método | Ruta                                                              |
| ---------------------- | ------ | ----------------------------------------------------------------- |
| Datos (QA) — **nuevo** | `GET`  | `/generador-documentos/acta-adjudicacion/{expedienteId}/datos`    |
| Generar                | `POST` | `/generador-documentos/generar/acta-adjudicacion/{expedienteId}`  |
| Preview                | `GET`  | `/generador-documentos/preview/acta-adjudicacion/{expedienteId}`  |
| Descargar              | `GET`  | `/generador-documentos/download/acta-adjudicacion/{expedienteId}` |

### Requisitos para generar

- Los mismos del Informe, **más**: el **Informe de Recomendación generado y vigente** (no marcado como desactualizado).
- Coincide con `gates.puedeGenerarActa`.

> **Cambio importante:** el Acta ya **no** se genera con la adjudicación antigua (`POST /expedientes/{id}/adjudicacion`). Sin dictámenes de la Gestión de Fase 3 responde **400**.

Si cambian los dictámenes o el informe: regenerar primero el **Informe** y después el **Acta**.

---

## 6. Notificaciones (adjudicado y no adjudicado)

Usan los dos prototipos nuevos. Las firma la **Secretaria de la Comisión**.

### 6.1 Quién recibe cuál (cambio de comportamiento)

Al generar se crea **una notificación por cada oferta evaluada**:

| Oferente                                              | Documento                     | `tipoDocumento`              |
| ----------------------------------------------------- | ----------------------------- | ---------------------------- |
| Su dictamen lo adjudica (TOTAL, o PARCIAL adjudicado) | Notificación de Adjudicación  | `NOTIFICACION_ADJUDICADO`    |
| Calificado que no fue adjudicado                      | Notificación a No Adjudicados | `NOTIFICACION_NO_ADJUDICADO` |
| **Descalificado** (nuevo: antes no recibía)           | Notificación a No Adjudicados | `NOTIFICACION_NO_ADJUDICADO` |

### 6.2 Motivación individual (solo en la de no adjudicados)

| Caso                  | Texto que sale                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| PARCIAL no adjudicado | La `causaNoAdjudicadoAuAu` del dictamen parcial                                                                                                 |
| TOTAL no adjudicado   | La causa del endpoint nuevo `…/no-adjudicado` (punto 3)                                                                                         |
| Descalificado         | Automático: _"Resultó descalificado en la Calificación Legal: {justificación que escribió el evaluador}"_ (o Financiera / Técnica / Evaluación) |

Correo del destinatario: el de la **oferta presentada**; si no tiene, el del proveedor del catálogo.

### 6.3 Endpoints

| Acción                 | Método | Ruta                                                                     |
| ---------------------- | ------ | ------------------------------------------------------------------------ |
| Datos (QA) — **nuevo** | `GET`  | `/generador-documentos/notificaciones/{expedienteId}/datos`              |
| Generar todas          | `POST` | `/generador-documentos/generar/notificaciones-fase4/{expedienteId}`      |
| Preview de una         | `GET`  | `/generador-documentos/preview/notificacion/evaluacion/{evaluacionId}`   |
| Descargar una          | `GET`  | `/generador-documentos/download/notificacion/evaluacion/{evaluacionId}`  |
| Estado                 | `GET`  | `/generador-documentos/expedientes/{expedienteId}/estado-notificaciones` |

Respuesta de `…/notificaciones/{expedienteId}/datos`:

```json
{
  "message": "Datos de las Notificaciones",
  "data": {
    "destinatarios": [
      {
        "evaluacionId": "uuid",
        "tipoDocumento": "NOTIFICACION_ADJUDICADO",
        "destinatario": "ALFA, C.A.",
        "tokens": { "...": "..." }
      },
      {
        "evaluacionId": "uuid",
        "tipoDocumento": "NOTIFICACION_NO_ADJUDICADO",
        "destinatario": "BETA, S.A.",
        "tokens": { "...": "..." }
      }
    ]
  }
}
```

Sirve para pintar la lista de destinatarios antes de generar. Preview y descarga usan el `evaluacionId` de cada uno y eligen solas el tipo.

### 6.4 Requisitos para generar

- Los mismos del Acta, **más**: el **Acta de Adjudicación generada y vigente**.
- Coincide con `gates.puedeGenerarNotificaciones`.

---

## Checklist para el frontend

- [ ] Hub legal, Sobre 2: campos `obsVerificadoGarantia` y `obsVerificadoCrs` (texto, opcional, máx. 500).
- [ ] Dictamen TOTAL y PARCIAL (adjudicado): campo numérico `montoManoObraOfertadoAuAu`.
- [ ] Gestión TOTAL: formulario de causa para los oferentes con `requiereCausaNoAdjudicado = true` → `PUT …/no-adjudicado`.
- [ ] Botón Informe: `puedeGenerarInforme && informePersistido`.
- [ ] Botón Acta: `puedeGenerarActa`. Mostrar el mensaje del 400 si falla.
- [ ] Botón Notificaciones: `puedeGenerarNotificaciones`. Listar destinatarios (incluye descalificados) con preview/descarga por `evaluacionId`.
- [ ] Mostrar como toast el `message` de los 400: todos explican qué falta.
