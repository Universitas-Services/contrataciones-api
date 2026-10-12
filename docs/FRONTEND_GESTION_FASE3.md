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
PUT  /evaluacion-fase3/expediente/:expedienteId/dictamenes/:evaluacionId/no-adjudicado
```

Body carácter: `{ "caracterAdjudicacion": "TOTAL" | "PARCIAL" }` → **409** si ya hay dictámenes o informe.

- **TOTAL:** dictamen de adjudicación solo a Primera Opción de evaluación.
- **TOTAL — causa de no adjudicación (nuevo):** cada calificado que **no** es Primera Opción necesita su causa, que se imprime en su Notificación a no adjudicados.
  - `PUT …/dictamenes/:evaluacionId/no-adjudicado` con body `{ "causaNoAdjudicadoAuAu": "texto" }` (obligatorio, no vacío).
  - **400** si el carácter no es TOTAL o si el oferente es la Primera Opción.
  - En `GET …/gestion-adjudicacion`, cada oferente trae `requiereCausaNoAdjudicado: true` cuando hay que pedirle la causa.
  - `gates.dictamenesCompletos` en TOTAL ahora exige: dictamen de la Primera Opción **y** causa de todos los demás calificados (igual que PARCIAL).
- **PARCIAL:** dictamen a cada calificado; si adjudicado → `posicionPrelacionAdjudicacion = "Primera Opción"` (no borra ranking Fase 2).
- **Garantía de mantenimiento / CRS ya NO van en los dictámenes** (TOTAL ni PARCIAL). Se quitaron `indVerificadoGarantiaAuAu` e `indVerificadoCrsAuAu` del body: ahora se responden por oferente en el **hub de Calificación Legal (Sobre 2)** — ver `docs/FRONTEND_DOCUMENTOS_FASE2.md` §8.5.
- **Nuevo campo `montoManoObraOfertadoAuAu`** (number, Bs.) en los dictámenes TOTAL y PARCIAL: monto de mano de obra ofertado por el adjudicado. Es la base de la Fianza Laboral del Informe de Recomendación. **Obligatorio** si Fase 1 tiene `requiereGarantiaLaboral = true` y el oferente se adjudica (TOTAL, o PARCIAL con `oferenteAdjudicadoProcedimientoAuAu = true`); si falta → **400**.

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
