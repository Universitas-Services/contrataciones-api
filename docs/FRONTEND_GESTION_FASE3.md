# Guía Frontend — Prelación automática + Gestión Adjudicación Fase 3

**Audiencia:** Frank / equipo frontend  
**Auth:** JWT Bearer

## 1. Orden de prelación (Fase 2) — solo lectura

- El select manual desaparece. **No enviar** `posicionPrelacion` en `PATCH .../hub/evaluacion` (se ignora).
- Ranking **denso** por `totalEvaluacion` (mayor → mejor). Empate → misma etiqueta (1,2,2,3).
- Casing canónico: `"Primera Opción"`, `"Segunda Opción"`, …
- Varias mismas etiquetas son válidas.
- Disparo:
  - Sin promoción: al `confirm` de `evaluacion`.
  - Con promoción: al `confirm` de `promocion`.
  - Descalificación en cualquier módulo → recalcula el resto.

Hub responde con `posicionPrelacion` y `puntuacionFinal`.  
Listado `GET /evaluacion-fase3/expediente/:id` incluye `posicionPrelacion`, `posicionPrelacionAdjudicacion`, `posicionPrelacionEfectiva`, `dictamenResumen`.

## 2. Gestión adjudicación

```http
GET  /evaluacion-fase3/expediente/:expedienteId/gestion-adjudicacion
PUT  /evaluacion-fase3/expediente/:expedienteId/gestion-adjudicacion/caracter
GET  /evaluacion-fase3/expediente/:expedienteId/dictamenes
PUT  /evaluacion-fase3/expediente/:expedienteId/dictamenes/:evaluacionId/total
PUT  /evaluacion-fase3/expediente/:expedienteId/dictamenes/:evaluacionId/parcial
```

Body carácter: `{ "caracterAdjudicacion": "TOTAL" | "PARCIAL" }` → **409** si ya hay dictámenes o informe.

- **TOTAL:** dictamen solo a Primera Opción de evaluación.
- **PARCIAL:** dictamen a cada calificado; si adjudicado → `posicionPrelacionAdjudicacion = "Primera Opción"` (no borra ranking Fase 2).
- **Garantía de mantenimiento / CRS ya NO van en los dictámenes** (TOTAL ni PARCIAL). Se quitaron `indVerificadoGarantiaAuAu` e `indVerificadoCrsAuAu` del body: ahora se responden por oferente en el **hub de Calificación Legal (Sobre 2)** — ver `docs/FRONTEND_DOCUMENTOS_FASE2.md` §8.5.

## 3. Informe

```http
POST /evaluacion-fase3/informe/:expedienteId
GET  /evaluacion-fase3/informe/:expedienteId
```

Campos nuevos: `existeItemsSinOfertas`, `itemsSinOfertas`, `motivoItemsSinOfertas` (+ aliases `*AuAu`).  
Alias justificación: `justificacionActualizacionPresupuestoAuAu` → `justificacionActualizacionPresup`.  
Enviar `validarCompleto: true` para exigir booleanos raíz + condicionales.  
Plazo: preferir dictamen (legacy en informe aún aceptado). Garantía/CRS ya no existen en el informe: se leen de la evaluación del oferente adjudicado (hub legal).

## 4. Documentos (paths existentes)

- Informe / acta / notificaciones: mismos endpoints del generador.
- Acta y notifs leen **dictámenes** si existen; si no, fallback `Adjudicacion` legacy.

## 5. Legacy

`POST /expedientes/:id/adjudicacion` = Elaboración / 1 ganador. **No** usar en hub Gestión.
