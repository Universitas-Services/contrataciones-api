# Fase 4 — Formalización: cambios implementados

**Rama:** `fase4`
**Base:** `main` en `277736d`
**Fecha:** 29 de octubre de 2026
**Responde a:** `API_FASE4_GESTION.md` (frontend) — la propuesta aceptada está en
[`FASE4_FORMALIZACION_GESTION.md`](./FASE4_FORMALIZACION_GESTION.md)

---

## 1. Qué se construyó

El módulo `formalizacion-fase4`: contratos por oferente adjudicado y el ciclo de
decaimiento de la adjudicación. **15 endpoints nuevos.**

Vive aparte del flujo antiguo: no toca `Adjudicacion` ni `ContratoFormalizado`,
que siguen sirviendo a elaboración. Se apoya en `DictamenAdjudicacion` (Fase 3) y
en `FasePreparatoria.modeloContratoData` (Fase 1).

---

## 2. Modelo de datos

**Migración:** `prisma/migrations/20261029_formalizacion_fase4/` — idempotente
(`IF NOT EXISTS` en todo, enums con `DO $$ … EXCEPTION`), se puede volver a correr.

### Tablas nuevas

| Tabla                                     | Para qué                                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `tb_contrato_definitivo_fase4_au_au`      | Un contrato por adjudicado. Las cláusulas van en JSON (`clauses`), con el mismo formato que la Fase 1 |
| `tb_decaimiento_adjudicacion_fase4_au_au` | Un registro por ciclo de decaimiento                                                                  |

**Dos campos que no estaban en el brief**, y que salen de sus preguntas 1 y 2:

- `monto_readjudicado_bs_au_au` — el monto que asume el subsiguiente en TOTAL.
- `plazo_ejecucion_subsiguiente_au_au` — su plazo, que es propio de cada oferta.

**Un índice que hace cumplir una regla en la base**, no solo en el código:

```sql
CREATE UNIQUE INDEX "tb_decaimiento_fase4_un_ciclo_activo"
  ON "tb_decaimiento_adjudicacion_fase4_au_au" ("id_expediente")
  WHERE "estado_decaimiento_au_au" = 'EN_CURSO' AND "deletedAt" IS NULL;
```

Aunque dos peticiones entren a la vez, no pueden abrir dos ciclos simultáneos.

### Cambios en tablas existentes

- `TipoDocumento` — cinco valores: `CERTIFICADO_INCUMPLIMIENTO`,
  `RESOLUCION_DECAIMIENTO`, `NOTIFICACION_DECAIMIENTO`,
  `NOTIFICACION_ADJUDICACION_SUBSIGUIENTE`, `NOTIFICACION_FIN_PROCEDIMIENTO`.
- `DocumentoGenerado.id_decaimiento` — así cada ciclo guarda sus documentos y un
  mismo tipo puede repetirse entre ciclos sin pisar el historial.
- `ExpedienteContratacion.sellado_fase4_at_au_au` — el cierre por desierto.
  **No se toca** `declaratoriaDesierto`: eso es de Fase 2 (Art. 113) y dispara
  los Informes Desierto #1–#3. Este cierre es por decaimiento (Art. 113.4).

### Enums nuevos

`EstadoContratoFase4` (BORRADOR | GENERADO), `EstadoDecaimiento`
(EN_CURSO | CERRADO), `DecisionDecaimiento` (SUBSIGUIENTE | DESIERTO).

---

## 3. Los 15 endpoints

Prefijo: `/formalizacion-fase4/expediente/{expedienteId}`. Todos con JWT.
Lectura para `ADMIN_ENTE`, `EJECUTOR` y `VISUALIZADOR`; escritura para los dos
primeros.

### Estado

| Método | Ruta | Qué hace                                           |
| ------ | ---- | -------------------------------------------------- |
| `GET`  | `/`  | Estado completo de la pantalla en una sola llamada |

Devuelve carácter, `sellado`, las cuatro compuertas, los oferentes con su
estatus/monto/alcance/contrato, el ciclo activo, el historial de ciclos
cerrados, los candidatos a siguiente opción y los participantes del cierre.

### Contratos

| Método | Ruta                                | Qué hace                                                                   |
| ------ | ----------------------------------- | -------------------------------------------------------------------------- |
| `GET`  | `/contratos/{evaluacionId}`         | Precarga. Si no existe, clona el modelo de Fase 1 y resuelve las variables |
| `PUT`  | `/contratos/{evaluacionId}`         | Guarda borrador                                                            |
| `POST` | `/contratos/{evaluacionId}/generar` | Congela el contenido y marca `GENERADO`                                    |

La precarga devuelve `tokens`: el diccionario `data-token-id` → valor ya
formateado, para que el editor muestre los datos reales.

### Decaimiento

| Método   | Ruta                                             | Paso                                  |
| -------- | ------------------------------------------------ | ------------------------------------- |
| `POST`   | `/decaimientos`                                  | Declarar (el switch)                  |
| `DELETE` | `/decaimientos/activo`                           | Deshacer — solo sin certificado       |
| `PATCH`  | `/decaimientos/activo/decision`                  | Siguiente opción o desierto           |
| `PUT`    | `/decaimientos/activo/certificado`               | 1 — certificado de incumplimiento     |
| `PUT`    | `/decaimientos/activo/resolucion`                | 2 — resolución                        |
| `POST`   | `/decaimientos/activo/notificacion-infractor`    | 3 — un clic                           |
| `POST`   | `/decaimientos/activo/notificacion-subsiguiente` | 4A — un clic                          |
| `POST`   | `/decaimientos/activo/cerrar`                    | 4A — cerrar el ciclo                  |
| `POST`   | `/decaimientos/activo/cierre-desierto`           | 4B — notificaciones en lote y sellado |

Cada uno devuelve el estado completo, igual que hace `gestion-adjudicacion`.

### Dos endpoints que no estaban en el brief

| Método   | Ruta                                        | Por qué se agregó                                                                                                                               |
| -------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/calcular-vencimientos?fechaNotificacion=` | Para que la vista previa del formulario use **el cálculo del servidor**, y no una segunda implementación en el frontend que termine divergiendo |
| `DELETE` | `/sellado`                                  | Salida de emergencia para un desierto declarado por error. Restringido a `UNIVERSITAS` y `SUPERVISOR`                                           |

---

## 4. Reglas implementadas

### Estatus de cada oferente (§5.1 del brief)

En este orden: `DECAIDO` (infractor de un ciclo cerrado) → `EN_DECAIMIENTO`
(infractor del ciclo activo) → `ADJUDICADO` (su dictamen lo adjudica, **o**
asumió una readjudicación) → `RESERVA`.

### Monto del contrato (§5.4)

Base del dictamen (`montoAdjudicadoTotal` o `…Parcial`) **más** lo que haya
asumido en readjudicaciones de ciclos cerrados. En PARCIAL suma los montos
parciales; en TOTAL, el `montoReadjudicadoBs` del certificado.

### Candidatos a siguiente opción (§5.3)

- **TOTAL:** el backend elige solo — el primer `RESERVA` por orden de prelación,
  sin contar al infractor ni a los decaídos.
- **PARCIAL:** se ofrecen todos los elegibles ordenados por puntuación y el
  usuario escoge uno en el certificado.

### Cascada y bloqueos (§5.5)

- Orden obligatorio: decisión → certificado → resolución → notificar al
  infractor → (notificar al subsiguiente → cerrar) o (cierre en lote).
  Saltarse un paso responde 400 con un mensaje legible.
- **Rehacer el certificado** borra la resolución y las notificaciones del ciclo
  y marca sus documentos como desactualizados. **Rehacer la resolución** hace lo
  mismo con las notificaciones.
- Contratos durante un ciclo: en **TOTAL** se bloquean todos; en **PARCIAL**,
  solo el del infractor.
- Al cerrar con siguiente opción, el infractor pasa a `DECAIDO`, el subsiguiente
  a `ADJUDICADO` sumando alcance y monto, y el switch vuelve a quedar disponible.
- El contrato del infractor se marca **desactualizado, no se borra**: es
  evidencia de un procedimiento administrativo.
- Tras el cierre en lote, toda escritura responde **409 «Expediente sellado»**.

### Fechas y lapsos (§5.6)

`fechaVencimientoGarantias` = notificación + 5 días hábiles;
`fechaVencimientoFirmaContrato` = + 8 días hábiles. Se saltan sábados, domingos y
los días no laborables del ente, tanto los puntuales como los recurrentes
(`MM-DD`). El día de la notificación no cuenta: el lapso corre desde el siguiente.

**El servidor recalcula siempre** y nunca confía en la fecha que mande el
frontend. La fecha de certificación no puede ser anterior a la de notificación.

Las notificaciones de los pasos 3 y 4 usan la fecha del servidor, sin formulario.

---

## 5. Variables del contrato: el catálogo ahora tiene `id`

Este era el hallazgo que no estaba previsto. El catálogo
(`src/biblioteca/constants/tokens-contrato.constants.ts`) identificaba cada token
**por su etiqueta en texto**. Con eso, cambiar una palabra de la etiqueta rompía
todas las cláusulas ya guardadas.

Qué se hizo:

1. **`id` en los 20 tokens**, usando los `data-token-id` que pide el frontend.
   El id es lo único que manda; la etiqueta es solo lo que lee el usuario.
2. **Se agregó `organo_adscripcion_au_au`**, que el frontend pedía y no existía.
   Su fuente (`EntePublico.organoAdscripcion`) ya estaba en la base.
3. **Índice `TOKENS_POR_ID`** para el parser.
4. Los tokens que el frontend no lista (lugar de ejecución, porcentajes, CRS,
   fecha de adjudicación) **se conservan** con su id, por si los suma al menú.

Las 14 variables del diccionario del brief **tienen fuente en la base**,
incluidas las que el frontend creía que faltaban: el órgano de adscripción, la
cédula del representante y el registro mercantil. La precarga las devuelve
resueltas.

### Parser de píldoras

`src/formalizacion-fase4/pildoras.util.ts` localiza cada variable por
`data-token-id`, nunca por el texto entre corchetes. Tres modos:

- **`RESOLVER`** (precarga) — mete el valor, conserva el id y agrega
  `data-resolved="true"`. No duplica el atributo al precargar dos veces.
- **`VALOR`** (documento final) — texto plano con el valor, o `________` si no hay.
- **`LINEA`** (pliego de Fase 1) — siempre `________`.

Tolera comillas simples o dobles y atributos en cualquier orden. Sin valor nunca
deja el corchete crudo a la vista.

---

## 6. Archivos

### Nuevos

```
src/formalizacion-fase4/
├── formalizacion-fase4.module.ts
├── formalizacion-fase4.controller.ts      15 endpoints
├── formalizacion-fase4.service.ts         estado, gates, contratos, tokens
├── decaimiento.service.ts                 el ciclo y sus reglas
├── dias-habiles.util.ts                   5 y 8 días hábiles con feriados
├── pildoras.util.ts                       parser por data-token-id
├── prelacion-fase4.util.ts                orden por "Primera Opción"…
├── tokens-contrato.resolver.ts            diccionario id → valor
├── dto/contrato.dto.ts
├── dto/decaimiento.dto.ts                 causales y modalidades del Art. 110/114
├── types/fase4.types.ts
├── dias-habiles.util.spec.ts              7 pruebas
├── pildoras.util.spec.ts                  10 pruebas
└── prelacion-fase4.util.spec.ts           5 pruebas

prisma/migrations/20261029_formalizacion_fase4/migration.sql
scripts/pruebas/prueba-fase4.ts            prueba del ciclo completo
docs/FASE4_FORMALIZACION_GESTION.md        la propuesta
docs/CAMBIOS_FASE4_IMPLEMENTACION.md       este documento
```

### Modificados

| Archivo                                                 | Cambio                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `prisma/schema.prisma`                                  | 2 modelos, 3 enums, 5 valores de `TipoDocumento`, 2 columnas |
| `src/biblioteca/constants/tokens-contrato.constants.ts` | `id` en 20 tokens, 1 token nuevo, `TOKENS_POR_ID`            |
| `src/app.module.ts`                                     | registro de `FormalizacionFase4Module`                       |

---

## 7. Verificación

| Qué                                      | Resultado                              |
| ---------------------------------------- | -------------------------------------- |
| `tsc --noEmit`                           | Sin errores                            |
| `eslint`                                 | Sin errores                            |
| Arranque de la app                       | Las 15 rutas registradas               |
| Pruebas unitarias                        | 22 nuevas, 39 en total — todas pasan   |
| Prueba del ciclo completo contra la base | **58 comprobaciones, todas correctas** |
| Migración aplicada en local              | Correcta                               |

La prueba de ciclo completo (`scripts/pruebas/prueba-fase4.ts`) siembra su propio
escenario, corre **los dos desenlaces** y borra todo lo que creó:

- **TOTAL → siguiente opción:** declarar, decidir, certificar, resolver,
  notificar a ambos y cerrar. Comprueba los bloqueos de contrato, que el servidor
  elige solo al subsiguiente, los dos vencimientos, el traspaso de estatus y
  monto, y que el ciclo pasa al historial dejando el switch disponible otra vez.
- **PARCIAL → procedimiento desierto:** las validaciones de modalidad degradada y
  renglones afectados, el cierre en lote, el sellado, el 409 posterior y el
  desellado de emergencia.
- **Los rechazos:** saltarse pasos, abrir dos ciclos, deshacer con certificado
  emitido, cambiar la decisión después del certificado, generar contrato a un
  decaído, y la fecha de certificación anterior a la de notificación.

Se corre así:

```bash
npx ts-node -T scripts/pruebas/prueba-fase4.ts
```

Aborta si `DATABASE_URL` no apunta a una base local.

---

## 8. Lo que queda pendiente

1. **Las 6 plantillas `.docx` — bloqueadas.** La estructura y los
   `{#bloques}` condicionales los puede armar el backend, pero **los textos
   legales exactos de cada bloque están en el PDF 3** de la documentación y hay
   que pedirlos. Hoy los endpoints registran el documento y su fecha; falta el
   archivo.
2. **Preview y download** de los documentos del decaimiento, que dependen de lo
   anterior.
3. **Avisar al frontend** de los dos endpoints que agregamos
   (`calcular-vencimientos` y `DELETE /sellado`) y del `id` de los tokens.
4. **Guía para el frontend** con los endpoints finales, al estilo de
   `FRONTEND_GESTION_FASE3.md`.
