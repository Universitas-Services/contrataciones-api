# Fase 2 — Hub de evaluación del oferente

Documentación del hub de evaluación para Concurso Abierto · Acto Único /
Apertura Única: qué cambió, por qué, y qué quedó pendiente.

- **Ruta del front:** `/gestion-expedientes/[expedienteId]/evaluacion/[evaluacionId]`
- **Base del API:** `/evaluacion-fase3/{evaluacionId}/hub`
- **Commit:** `b810c79` · **Migración:** `20260926_hub_evaluacion_fase2`
- **Swagger:** `/api/docs`, tag _🧮 Fase 2 — Hub de evaluación del oferente_

Para la referencia de llamadas y payloads, ver
[ENDPOINTS_NUEVOS.md](ENDPOINTS_NUEVOS.md) §8.

---

## 1. Qué problema resolvía

El hub **no persistía en el API**. Las plantillas —qué recaudos y criterios se
evalúan— salían de mocks, y las respuestas vivían en `sessionStorage` bajo
`evaluacion-oferente-ca-au:{evaluacionId}`. Los botones de guardar y confirmar
hacían un `setTimeout` y no llamaban a ningún endpoint.

Consecuencias prácticas: no se podía evaluar desde dos dispositivos, no había
rastro de quién calificó qué, y el dictamen lo decidía el navegador.

### Por qué `evaluacion-fase3` no alcanzaba

El recurso existente sigue siendo válido como **identidad** de la evaluación
(una fila por oferta, creada con `POST /evaluacion-fase3/iniciar`), pero su
forma no sirve para este hub:

| Pieza existente                                                      | Por qué no sirve                                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `PATCH .../sobre1` y `.../sobre2` con banderas fijas                 | El pliego exige un subconjunto **variable** de recaudos, más los personalizados del ente |
| `PATCH .../calificacion` con `indiceLiquidez`, `actividadComercial`… | Financiera y técnica son rúbricas **configuradas en Fase 1**, no esos campos             |
| Umbrales y ponderaciones en código                                   | Vienen del micromódulo de Fase 1, no son constantes                                      |
| —                                                                    | No existía módulo de promoción económica                                                 |

**Decisión:** no ampliar esos PATCH monolíticos. Se agregó un subrecurso `hub`
sobre el mismo `evaluacionId`, y los antiguos quedan intactos para el flujo
legacy.

---

## 2. Arquitectura

Tres servicios con responsabilidades separadas:

```
HubController ──> HubService ──┬──> SnapshotService   (lee Fase 1, arma plantillas)
                               └──> ScoringService    (motor de puntaje puro)
```

**`SnapshotService`** lee la `FasePreparatoria` del expediente y construye las
cinco plantillas. No sabe nada de evaluaciones.

**`ScoringService`** es puro: recibe plantilla + formulario y devuelve
`{ errores, total, cumple }`. No toca la base, lo que lo hace trivial de probar.

**`HubService`** orquesta: control de acceso, máquina de estados, compuertas y
persistencia.

---

## 3. Las plantillas vienen de Fase 1

Al abrir el hub se arma un **snapshot inmutable** de lo exigido en el
expediente. Si el pliego se edita después, la evaluación en curso **conserva**
la plantilla con la que empezó.

| Módulo del hub | Origen en Fase 1                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Legal          | Recaudos marcados como exigidos + personalizados del ente + ítem fijo de oferta técnico-económica |
| Financiera     | Criterios activos (descapital e índices) y su puntuación mínima                                   |
| Técnica        | Criterios de calificación técnica con ponderación y rangos                                        |
| Evaluación     | Criterios técnicos y económicos, con el máximo de cada lado                                       |
| Promoción      | Banderas de Actividades Previas. Si no está activa, **el módulo no existe**                       |

El banner del oferente —nombre, RIF y monto— sale de la oferta ligada al
`evaluacionId`, no de un mock.

### Qué dato faltaba y hubo que resolver

El brief asumía tres datos que **Fase 1 no guarda**:

**Preguntas y etiquetas de los recaudos.** El catálogo sólo tenía ids. Se
redactaron los textos de los 20 recaudos y se agregaron al catálogo en
`src/fase1/constants/recaudos-legales.constants.ts`, que es su sitio natural.

**Metadatos de los criterios financieros.** Fase 1 sólo guarda si el criterio
está activo y sus rangos; el título, la pregunta y el basamento legal son
constantes del dominio y viven en
`hub/constants/criterios-financieros.constants.ts`.

**Ids de los rangos.** El contrato los exige para `rangoIdSeleccionado`, pero
Fase 1 no los guarda. Se generan de forma determinista (`{criterioId}__r{n}`),
así que son estables entre llamadas.

> Los textos de recaudos y el basamento legal de los criterios financieros se
> redactaron en esta implementación. **Conviene que un abogado los revise**
> antes de que lleguen a un documento oficial.

---

## 4. Los endpoints

```
GET    /evaluacion-fase3/{evaluacionId}/hub
PATCH  /evaluacion-fase3/{evaluacionId}/hub/legal
PATCH  /evaluacion-fase3/{evaluacionId}/hub/financiera
PATCH  /evaluacion-fase3/{evaluacionId}/hub/tecnica
PATCH  /evaluacion-fase3/{evaluacionId}/hub/evaluacion
PATCH  /evaluacion-fase3/{evaluacionId}/hub/promocion
```

Los cinco `PATCH` comparten cuerpo:

```json
{ "action": "draft" | "confirm", "form": { } }
```

`draft` guarda el formulario tal como esté, **sin** validar reglas y **sin**
abrir la pestaña siguiente. `confirm` valida, calcula el dictamen y aplica la
compuerta.

La respuesta de cualquier `PATCH` es **el mismo documento del `GET`** ya
actualizado, para que el frontend reemplace su estado de una vez en lugar de
recomponerlo.

Roles: lectura para todos; escritura para `ADMIN_ENTE`, `EJECUTOR` y
`UNIVERSITAS`. El acceso se valida contra el ente del expediente.

---

## 5. Compuertas: el servidor es la fuente de verdad

```
legal → financiera → técnica → evaluación → promoción (si está activa)
```

| Al confirmar | CUMPLE                                                                        | NO CUMPLE                                  |
| ------------ | ----------------------------------------------------------------------------- | ------------------------------------------ |
| Legal        | Abre financiera, sigue en curso                                               | **Descalifica** y cierra todo lo posterior |
| Financiera   | Abre técnica                                                                  | Descalifica y cierra                       |
| Técnica      | Abre evaluación                                                               | Descalifica y cierra                       |
| Evaluación   | Con promoción activa: la abre y sigue en curso. Sin promoción: **calificado** | Descalifica                                |
| Promoción    | **calificado**                                                                | — (nunca descalifica)                      |

Legal CUMPLE sólo si **todos** los ítems eliminatorios están en SI. El recaudo
del VAN se coteja pero **no es eliminatorio**: la promoción económica es un
bono, no un requisito de calificación.

Al primer borrador, `resultadoFinal` pasa de `pendiente` a `en_evaluacion`.
Tocar una pestaña bloqueada o reconfirmar una cerrada devuelve **409**.

---

## 6. Motor de puntaje

El frontend puede previsualizar, pero **el valor persistido es siempre el del
servidor**.

**Financiera.** Descapital en SI vale 0 puntos; en NO, el máximo. Los índices
caen en una de tres bandas. El **endeudamiento es inverso**: premia el valor más
bajo. Se acepta coma o punto decimal. CUMPLE si el total alcanza la puntuación
mínima del pliego.

**Técnica y cada lado de la evaluación.** Con varios rangos (_Modo A_) el
evaluador elige uno y el puntaje es el del rango. Con un solo rango (_Modo B_)
el puntaje es libre entre 0 y ese máximo; **excederlo rechaza la confirmación
con 422**, no se recorta al tope. Siempre hace falta el sustento, con tope de
255 caracteres.

**Evaluación global.** CUMPLE sólo si **ambos** lados alcanzan su mínimo.
`notaBase = totalTécnico + totalEconómico`. La prelación se exige únicamente
cuando ambos cumplen.

**Promoción.** Suma bonos sobre la nota ya persistida. **Nunca descalifica** y
el total **puede superar 100**. La `notaBase` que envíe el cliente se **ignora**:
el servidor usa la suya. Si el oferente no consignó la declaración del VAN, ese
bono es 0 y **no es un error**.

---

## 7. Persistencia

La fila `tb_evaluacion_resultados` sigue siendo el ancla. Se agregaron 9
columnas, sin tocar los booleanos antiguos de sobre:

```
plantillas_snapshot_au_au    snapshot congelado de las 5 plantillas
hub_legal_au_au              form + submitted + dictamen
hub_financiera_au_au         form + submitted + dictamen + total
hub_tecnica_au_au            form + submitted + dictamen + total
hub_evaluacion_au_au         form + submitted + dictámenes + totales + notaBase
hub_promocion_au_au          form + submitted + bonos + nota final
hub_unlocked_au_au           estado de desbloqueo por pestaña
hub_active_modulo_au_au      pestaña activa
hub_resultado_final_au_au    pendiente | en_evaluacion | descalificado | calificado
```

Los dictámenes **se reflejan además en las columnas históricas** del modelo
(`oferenteCalificadoLegal`, `totalCalifTecnica`, `totalEvaluacion`,
`posicionPrelacion`…), para que el generador de lista de cotejo e informe siga
funcionando sin cambios.

La migración es **aditiva**: sólo agrega columnas JSON nullable. No altera datos
existentes ni el flujo legacy.

---

## 8. Verificación

Probado end-to-end contra la base local, recorriendo el flujo completo de un
oferente:

| Criterio del checklist                                   | Resultado                                                              |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Sólo los recaudos exigidos, no el catálogo               | **19 ítems**: 17 exigidos + 1 personalizado + oferta técnico-económica |
| Personalizados marcados con `personalizado: true`        | ✅                                                                     |
| Reabrir mantiene módulo y respuestas                     | ✅ todo persistió                                                      |
| Borrador no abre la pestaña siguiente                    | ✅ pasó a `en_evaluacion`, `unlocked.financiera` siguió en `false`     |
| NO en eliminatorio descalifica y cierra                  | ✅ los 4 `unlocked` quedaron en `false`                                |
| NO en el VAN (no eliminatorio) no tumba                  | ✅ siguió calificado                                                   |
| Descapital SI = 0; índice en su banda; umbral del pliego | ✅ total 60 con mínimo 60, no 70 fijo                                  |
| Índice inverso (endeudamiento)                           | ✅ 0.2 ≤ 0.3 dio el máximo                                             |
| Coma decimal                                             | ✅ `"2,5"` se interpretó correctamente                                 |
| Modo A toma el puntaje del rango                         | ✅ 60 + 40 = 100                                                       |
| Con promoción, nota > 100 y no descalifica               | ✅ **107** = 100 base + 4 VAN + 3 local                                |
| `notaBase` del cliente se ignora                         | ✅ se envió `999` y usó la persistida                                  |
| Reconfirmar responde 409                                 | ✅                                                                     |
| Confirmar sin justificación responde 422                 | ✅ con 20 errores concretos en español                                 |

### Dos caminos sin probar

Son ramas implementadas que **ningún caso de prueba ejercitó**, porque el seed
actual no tiene la configuración necesaria:

**Modo B de puntaje** (criterio con un solo rango, puntaje libre). Todas las
pruebas pasaron por Modo A. La validación que rechaza un puntaje mayor al
máximo no se vio fallar en vivo.

**La rama sin promoción económica.** El seed tiene `activaPromocionEconomica`
en `true`, así que no se verificó que al confirmar evaluación el resultado quede
en `calificado` directamente y que `plantillaPromocion` venga en `null`.

Ambos se cubren agregando al seed un segundo expediente con esa configuración.

---

## 9. Pendientes

- **Nota de deprecación en Swagger** para `PATCH /sobre1`, `/sobre2` y
  `/calificacion`, aclarando que no alimentan este hub.
- **Revisión legal** de los textos de recaudos y del basamento de los criterios
  financieros.
- **Tests automatizados** del `ScoringService`. Al ser puro, es el candidato más
  barato y rentable para cubrir con pruebas unitarias.

Fuera de alcance por decisión del brief: alta de oferentes, adquirientes,
procedimiento desierto y el generador de lista de cotejo e informe, que siguen
usando el `evaluacionId` sin cambios.

---

## 10. Archivos

**Nuevos**

```
src/evaluacion-fase3/hub/
  hub.controller.ts                              6 endpoints
  hub.service.ts                                 máquina de estados y compuertas
  snapshot.service.ts                            construye las plantillas desde Fase 1
  scoring.service.ts                             motor de puntaje (puro)
  types/hub.types.ts                             contratos de plantillas y formularios
  dto/hub-patch.dto.ts                           cuerpo común de los PATCH
  constants/criterios-financieros.constants.ts   metadatos de los 6 criterios

prisma/migrations/20260926_hub_evaluacion_fase2/migration.sql
docs/FASE2_HUB_EVALUACION.md                     este documento
```

**Modificados**

```
prisma/schema.prisma                             9 columnas en EvaluacionResultados
src/evaluacion-fase3/evaluacion-fase3.module.ts  registro del hub
src/fase1/constants/recaudos-legales.constants.ts  pregunta y etiqueta de los 20 recaudos
docs/ENDPOINTS_NUEVOS.md                         sección 8 con la referencia del hub
```

> El tipo `UsuarioActual` debe importarse con `import type`. El proyecto usa
> `isolatedModules` + `emitDecoratorMetadata`, y sin eso TypeScript falla con
> `TS1272` en cualquier firma decorada.
