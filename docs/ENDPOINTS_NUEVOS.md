# Endpoints nuevos — referencia funcional

Los 71 endpoints agregados al backend, con qué hace cada uno.

- **Producción:** `https://contrataciones-api.onrender.com`
- **Swagger:** `/api/docs`
- **Autenticación:** todos exigen `Authorization: Bearer <JWT>`. Sin token responden **401**.
- **Commits:** `96945e2` (Fase 1 y cuentas bancarias) y `5bf3649` (bibliotecas y documentos de ejemplo)

## Roles

| Rol            | Alcance general                                                      |
| -------------- | -------------------------------------------------------------------- |
| `UNIVERSITAS`  | Todo, en cualquier ente. Único que administra los catálogos globales |
| `SUPERVISOR`   | Lectura en cualquier ente                                            |
| `ADMIN_ENTE`   | Lectura y escritura, sólo en su ente                                 |
| `EJECUTOR`     | Lectura y escritura, sólo en su ente                                 |
| `VISUALIZADOR` | Sólo lectura, en su ente                                             |

---

## 1. Progreso de la Fase 1

### `GET /expedientes/{expedienteId}/fase-preparatoria/progreso`

El endpoint más importante de la Fase 1: **reemplaza el `localStorage` del frontend**. Devuelve, en una sola llamada, todo lo que el panel necesita para pintarse.

Responde con el estado de los 10 micromódulos, el de los 4 documentos maestros, si el pliego ya se puede generar y, cuando no, la lista concreta de lo que falta.

```json
{
  "modalidad": "LICITACION_PUBLICA",
  "micromodulos": {
    "actividades-previas": "COMPLETADO",
    "llamado": "BORRADOR",
    "aspectos-generales": "PENDIENTE",
    "modelo-contrato": "PENDIENTE",
    "calificacion-legal": "PENDIENTE",
    "calificacion-financiera": "PENDIENTE",
    "calificacion-tecnica": "PENDIENTE",
    "evaluacion-tecnica-economica": "PENDIENTE",
    "especificaciones-tecnicas": "COMPLETADO",
    "presupuesto-base": "COMPLETADO"
  },
  "documentos": {
    "actividades-previas": "DISPONIBLE",
    "pliego": "BLOQUEADO",
    "acta-inicio": "BLOQUEADO",
    "llamado": "BLOQUEADO"
  },
  "pliegoReady": false,
  "pliegoMissing": ["Aspectos Generales del Pliego", "Modelo de Contrato", "..."],
  "phaseComplete": false,
  "totales": { "itemsPresupuesto": 2, "especificacionesCargadas": true }
}
```

**Estados de micromódulo:** `PENDIENTE` (sin tocar), `BORRADOR` (datos parciales guardados), `COMPLETADO` (validado y cerrado).

**Estados de documento:** `BLOQUEADO` (no se cumplen los requisitos), `DISPONIBLE` (ya se puede generar), `GENERADO`, `DESACTUALIZADO` (se editó un micromódulo después de generarlo, hay que regenerar).

`pliegoMissing` trae nombres legibles, listos para mostrarse en el tooltip del botón bloqueado.

Roles: todos.

---

## 2. Los 8 micromódulos con formulario

Los ocho comparten **el mismo patrón de cuatro operaciones**. Prefijo: `/expedientes/{expedienteId}/fase-preparatoria/`

| Verbo  | Ruta                 | Funcionalidad                                                                                                                                                                               |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `{modulo}`           | Devuelve los datos guardados y el estado actual del micromódulo                                                                                                                             |
| `PUT`  | `{modulo}`           | **Guarda borrador.** Acepta datos parciales sin validar reglas de negocio; deja el módulo en `BORRADOR`. Si ya estaba `COMPLETADO`, lo mantiene y marca los documentos como desactualizados |
| `POST` | `{modulo}/completar` | **Cierra el micromódulo.** Aplica todas las reglas de negocio; si algo falla devuelve **400** con la lista de errores. Si pasa, queda `COMPLETADO`                                          |
| `POST` | `{modulo}/reabrir`   | Devuelve el módulo a `BORRADOR` para poder editarlo, e invalida los documentos ya generados                                                                                                 |

**Módulos disponibles:**

```
actividades-previas
llamado
aspectos-generales
modelo-contrato
calificacion-legal
calificacion-financiera
calificacion-tecnica
evaluacion-tecnica-economica
```

**Por qué borrador y completar están separados:** el usuario debe poder llenar medio formulario, irse y volver después. Por eso los DTOs tienen todos los campos opcionales y la exigencia vive en el validador del servicio, que además aplica reglas condicionales que las anotaciones no pueden expresar.

**Formato del error al completar:**

```json
{
  "message": "No se puede completar \"Actividades Previas\".",
  "errores": [
    "El número de referencia SNC es obligatorio.",
    "Debe responder: ¿El proyecto está aprobado?.",
    "El plazo de ejecución debe ser un número mayor a 0."
  ]
}
```

Roles: lectura todos; escritura `ADMIN_ENTE`, `EJECUTOR`, `UNIVERSITAS`.

### Qué valida cada micromódulo al completar

**`actividades-previas`** — Es la **puerta de entrada**: ningún otro micromódulo puede completarse antes que este. Exige referencia SNC, justificaciones, fecha de estudio de mercado, certificación presupuestaria y plazo mayor a 0. `proyectoAprobado` sólo se exige si el expediente es de tipo **OBRAS**. Si no permite PyMES pide justificación; si el contrato marco es viable, también. Con promoción económica activa: VAN entre 1 y 10 y bonos con puntuación mayor a 0.

**`llamado`** — Exige objetivo específico, dirección y horario de retiro del pliego, y hora del acto. Si el pliego tiene costo (`pliegoCosto: true`), se vuelven obligatorios el monto, banco, cuenta, titular y **RIF** del titular.

> El módulo expone `pliegoCosto` (true = tiene costo). La base guarda el valor inverso en `pliegoGratuito` por compatibilidad con el wizard antiguo; el servicio convierte.

**`aspectos-generales`** — Régimen legal, condiciones de oferta, CRS y garantías. Porcentajes entre 0 y 100. **Anticipo máximo 50%**, tanto el normal como el especial. Moneda o idioma distintos exigen indicar cuál.

**`modelo-contrato`** — Al menos una cláusula, cada una con título y contenido.

**`calificacion-legal`** — Los 20 recaudos del catálogo respondidos SI/NO. Los sustitutos se exigen sólo si el recaudo padre fue exigido. **Al menos un recaudo exigido por sobre.** Un recaudo personalizado con `tieneModelo: true` exige el documento cargado.

**`calificacion-financiera`** — Al menos un criterio activo. Rangos ascendentes (`máximo > hasta ≥ desde ≥ mínimo`), salvo endeudamiento que es **inverso** (`óptimo < desde ≤ hasta ≤ deficiente`). Puntuación mínima entre 1 y 100.

**`calificacion-tecnica`** — La suma de las ponderaciones debe ser **exactamente 100 puntos**. Ningún rango puede superar la puntuación de su criterio padre. La puntuación mínima no puede superar el total.

**`evaluacion-tecnica-economica`** — Técnica + económica deben sumar **exactamente 100 puntos** (bolsa compartida). Mismas reglas de rangos y umbrales por bloque.

### Cuerpo de los micromódulos dinámicos

Cuatro de ellos manejan colecciones anidadas de tamaño variable, así que su formulario viaja bajo `data` y se guarda en JSONB. Swagger trae un ejemplo completo y **válido** de cada uno, copiable tal cual.

**`calificacion-legal`**

```json
{
  "data": {
    "exigidos": { "modCartaOfertaAuAu": true, "modCertificadoRncAuAu": false },
    "sustitutos": { "sustitutoDjRifVigenteAuAu": true },
    "personalizados": [
      {
        "sobre": 2,
        "descripcion": "Planilla de compromiso local",
        "exigido": true,
        "tieneModelo": true,
        "archivoModeloUrl": "https://.../modelo.pdf"
      }
    ]
  }
}
```

**`calificacion-tecnica`**

```json
{
  "data": {
    "criterios": [
      {
        "nombre": "Experiencia acumulada",
        "puntuacion": 60,
        "rangos": [
          { "descripcion": "10 años o más", "puntaje": 60 },
          { "descripcion": "Entre 5 y 9 años", "puntaje": 35 }
        ]
      }
    ],
    "puntuacionMinimaCalifTecnica": 70
  }
}
```

**`evaluacion-tecnica-economica`**

```json
{ "data": {
  "tecnica":   { "criterios": [...], "puntuacionMinima": 25 },
  "economica": { "criterios": [...], "puntuacionMinima": 30 }
}}
```

**`calificacion-financiera`** — criterios activables (`Descapital`, `Solvencia`, `Rotacion`, `Rendimiento`, `Rentabilidad`, `Endeudamiento`), cada uno con su bloque `rangos<Criterio>`.

**`modelo-contrato`** — `{ "data": { "clauses": [...] } }` con cláusulas ordenadas.

---

## 3. Archivos de la Fase 1

### `GET /expedientes/{expedienteId}/fase-preparatoria/especificaciones-tecnicas`

Devuelve la metadata del archivo: nombre, tipo, tamaño, URL, quién lo subió y cuándo. Si no hay archivo, responde con estado `PENDIENTE`.

### `POST .../especificaciones-tecnicas`

Sube el archivo de especificaciones. `multipart/form-data` con el campo `file`, **PDF o DOCX, máximo 10 MB**. Sólo se admite un archivo por expediente: subir otro reemplaza el anterior. Marca los documentos generados como desactualizados.

Roles: `ADMIN_ENTE`, `EJECUTOR`, `UNIVERSITAS`.

### `DELETE .../especificaciones-tecnicas`

Borrado lógico. El micromódulo vuelve a `PENDIENTE` y el pliego se bloquea de nuevo.

### `POST .../calificacion-legal/modelos`

Sube el **documento modelo de un recaudo personalizado** (PDF/DOCX, máx 10 MB) — el archivo que los oferentes van a descargar. Devuelve `archivoModeloUrl`, que el frontend debe guardar dentro del recaudo en `personalizados`.

Es obligatorio: al completar Calificación Legal, todo recaudo con `tieneModelo: true` debe tener esa URL.

---

## 4. Cuentas bancarias del ente

Alimentan la selección de cuenta de pago del pliego en el micromódulo Llamado.

| Endpoint                                        | Funcionalidad                                                 |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `GET /entes/{enteId}/cuentas-bancarias`         | Lista las cuentas registradas del ente                        |
| `POST /entes/{enteId}/cuentas-bancarias`        | Registra una cuenta: banco, número (≤20), tipo, titular y RIF |
| `PATCH /entes/{enteId}/cuentas-bancarias/{id}`  | Actualiza los datos de una cuenta                             |
| `DELETE /entes/{enteId}/cuentas-bancarias/{id}` | Borrado lógico                                                |

Roles: lectura todos; escritura `ADMIN_ENTE` y `UNIVERSITAS`.

---

## 5. Bibliotecas de normativa y cláusulas

Cuatro recursos en **dos niveles**, cada uno con su tabla:

| Nivel       | Recurso             | Tabla                          | Quién escribe      |
| ----------- | ------------------- | ------------------------------ | ------------------ |
| Universitas | Normativa global    | `tb_normativa_global`          | Sólo `UNIVERSITAS` |
| Universitas | Cláusulas genéricas | `tb_clausulas_genericas_ente`  | Sólo `UNIVERSITAS` |
| Ente        | Normativa del ente  | `tb_normativa_ente`            | El propio ente     |
| Ente        | Cláusulas del ente  | `tb_biblioteca_clausulas_ente` | El propio ente     |

**Regla de visibilidad:** lo que crea Universitas lo **consultan todos los entes** pero sólo Universitas lo edita. Lo que crea un ente **sólo lo ve ese ente** — pedir la biblioteca de otro devuelve **403**, incluso conociendo la URL, porque el `enteId` de la ruta se compara contra el del token. `UNIVERSITAS` y `SUPERVISOR` pueden consultar la de cualquiera.

### Nivel Universitas

| Endpoint                                      | Funcionalidad                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET /biblioteca/normativa-global`            | Lista la normativa común. Paginación, búsqueda en el texto y filtro `indActivo`     |
| `GET /biblioteca/normativa-global/{id}`       | Consulta una norma                                                                  |
| `POST /biblioteca/normativa-global`           | Crea una norma. Campo `textoNormativaCompleto` (texto íntegro) más `indActivo`      |
| `PATCH /biblioteca/normativa-global/{id}`     | Actualiza. `indActivo: false` la retira sin borrarla (por ejemplo, si fue derogada) |
| `DELETE /biblioteca/normativa-global/{id}`    | Borrado lógico                                                                      |
| `GET /biblioteca/clausulas-genericas`         | Lista las cláusulas modelo comunes                                                  |
| `GET /biblioteca/clausulas-genericas/{id}`    | Consulta una cláusula                                                               |
| `POST /biblioteca/clausulas-genericas`        | Crea una cláusula: `titulo` y `cuerpo`                                              |
| `PATCH /biblioteca/clausulas-genericas/{id}`  | Actualiza                                                                           |
| `DELETE /biblioteca/clausulas-genericas/{id}` | Borrado lógico                                                                      |

### Nivel Ente

| Endpoint                                | Funcionalidad                             |
| --------------------------------------- | ----------------------------------------- |
| `GET /entes/{enteId}/normativa`         | Lista la normativa propia del ente        |
| `GET /entes/{enteId}/normativa/{id}`    | Consulta una norma del ente               |
| `POST /entes/{enteId}/normativa`        | Agrega normativa a la biblioteca del ente |
| `PATCH /entes/{enteId}/normativa/{id}`  | Actualiza                                 |
| `DELETE /entes/{enteId}/normativa/{id}` | Borrado lógico                            |
| `GET /entes/{enteId}/clausulas`         | Lista las cláusulas guardadas por el ente |
| `GET /entes/{enteId}/clausulas/{id}`    | Consulta una cláusula del ente            |
| `POST /entes/{enteId}/clausulas`        | Guarda una cláusula propia                |
| `PATCH /entes/{enteId}/clausulas/{id}`  | Actualiza                                 |
| `DELETE /entes/{enteId}/clausulas/{id}` | Borrado lógico                            |

**Nombres uniformes.** Las tablas usan columnas distintas para lo mismo (`titulo_clausula_generica` y `titulo_clausula_bib`), pero **la API expone `titulo` y `cuerpo` en ambos niveles**, más un campo `origen` que vale `"generica"` o `"biblioteca"`. Así el frontend puede pedir las dos listas y mezclarlas en el selector del Modelo de Contrato sin transformar nada.

Todos los listados aceptan `page`, `limit` y `search`.

---

## 6. Datos entre corchetes en las cláusulas

El mecanismo que permite que una misma cláusula sirva en Fase 1 y en Fase 4.

El texto se guarda como **texto plano**, y lo que va entre corchetes es a la vez la etiqueta que lee el usuario y la llave del dato:

```
El monto total del presente contrato es la cantidad de [MONTO CONTRATO EN LETRAS]
(Bs. [MONTO CONTRATO EN NUMEROS]), imputable a la partida [PARTIDA PRESUPUESTARIA].
```

Al comparar se **normaliza** (mayúsculas, sin acentos, espacios colapsados), así que `[Monto  Contrato en Letras]` resuelve igual que `[MONTO CONTRATO EN LETRAS]`.

### `GET /biblioteca/tokens`

Catálogo de los **20 datos disponibles**. Cada uno trae `insertar` con el texto exacto a colocar en la cláusula, y `disponibleDesde`:

- **`EXPEDIENTE`** (9 datos) — ya existen en Fase 1: objeto, código, ente, RIF, plazo, lugar de ejecución y los porcentajes de fiel cumplimiento, anticipo y CRS.
- **`ADJUDICACION`** (11 datos) — sólo existen tras adjudicar: montos en números y letras, CRS, partida, fecha, y los datos del contratista (nombre, RIF, representante legal, cédula, registro mercantil).

Esa distinción es la que le permite al frontend avisar _"este dato no tendrá valor hasta que se adjudique"_.

### `POST /biblioteca/tokens/validar`

Valida los corchetes de un texto **antes de guardarlo**. Devuelve los datos detectados y, si alguno no existe, el error con una sugerencia:

```json
{
  "valido": false,
  "errores": [
    "El dato [MONTO CONTRATO EN LTRAS] no existe en el catálogo. ¿Quisiste decir [MONTO CONTRATO EN LETRAS]?"
  ]
}
```

> La validación también corre **dentro** del `POST`/`PATCH` de cláusulas, así que aunque el frontend se la salte, ninguna cláusula rota llega a la base.

### `POST /biblioteca/tokens/preview`

Previsualiza cómo queda el texto en cada documento. Parámetro `modo`:

| Modo       | Resultado                                                                              | Se usa en                 |
| ---------- | -------------------------------------------------------------------------------------- | ------------------------- |
| `ETIQUETA` | `...la cantidad de MONTO CONTRATO EN LETRAS (Bs. MONTO CONTRATO EN NUMEROS)...`        | Pliego de Fase 1          |
| `LINEA`    | `...la cantidad de ________________ (Bs. _______________)...`                          | Pliego para llenar a mano |
| `VALOR`    | `...la cantidad de TRECE MILLONES SETECIENTOS CINCUENTA MIL... (Bs. 13.750.250,75)...` | Contrato de Fase 3/4      |

El modo `VALOR` requiere `expedienteId`. Si un dato aún no existe, **conserva su etiqueta** en lugar de quedar vacío.

> El monto en letras se **deriva** de la cifra: la base sólo guarda `montoAdjudicadoBs`. Se agregó un conversor número→letras en español con céntimos.

### `GET /biblioteca/tokens/ejemplo`

Ejemplo funcional listo para probar, con `?modo=` opcional.

Roles: lectura todos; validar y previsualizar `ADMIN_ENTE`, `EJECUTOR`, `UNIVERSITAS`.

---

## 7. Documentos de ejemplo

Guías visuales que carga Universitas para que los entes vean cómo debe quedar cada documento mientras llenan los formularios.

| Endpoint                              | Funcionalidad                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /documentos-ejemplo`             | Lista los ejemplos. Paginación, búsqueda y filtro `activo`. Ordenados por `orden`          |
| `GET /documentos-ejemplo/{codigo}`    | **Consulta por código legible** (`documento-01`) o por UUID                                |
| `POST /documentos-ejemplo`            | Carga un ejemplo: `nombre` + imagen en una sola llamada multipart (JPG/PNG/WEBP, máx 5 MB) |
| `PATCH /documentos-ejemplo/{id}`      | Actualiza nombre, código, descripción, orden o `activo`                                    |
| `PUT /documentos-ejemplo/{id}/imagen` | Reemplaza sólo la imagen, conservando el código y los datos                                |
| `DELETE /documentos-ejemplo/{id}`     | Borrado lógico                                                                             |

**El código legible es la clave del diseño.** Cada pantalla del frontend pide su ejemplo con `GET /documentos-ejemplo/documento-02`, sin necesidad de conocer el UUID ni de listar primero. El endpoint acepta ambos, así que el panel de administración puede seguir usando el id.

Si al cargar no se envía código, se asigna **el siguiente de la serie** automáticamente. Un código repetido devuelve **409**.

`activo: false` oculta un ejemplo sin borrarlo — útil cuando un documento cambia de formato y el ejemplo viejo confundiría.

Roles: **lectura para todos** (es el punto del módulo: los entes consultan, no editan); escritura sólo `UNIVERSITAS`.

---

## 8. Endpoints existentes que cambiaron

No son nuevos, pero su comportamiento sí cambió.

### `/fase-preparatoria/{expedienteId}` (GET, POST, PATCH)

El monolito que usa el wizard antiguo. **Estaba abierto sin autenticación**; ahora exige JWT y valida que el expediente pertenezca al ente del usuario. Además registra `createdBy`/`updatedBy`, que antes quedaban nulos.

Se mantiene operativo para no romper el wizard mientras el frontend migra al panel de micromódulos.

### `/expedientes/{id}/presupuesto-items` y `/expedientes/presupuesto-items/{itemId}`

También **estaban abiertos sin autenticación**. Cambios:

- Exigen JWT y validan pertenencia al ente
- El `DELETE` es ahora **borrado lógico**, no físico
- Toda mutación **sincroniza `Expediente.totalPresupuesto`**, que antes nunca se actualizaba
- El listado global `GET /expedientes/presupuesto-items` quedó restringido a `UNIVERSITAS` y `SUPERVISOR`
- La respuesta trae `totales.porcentajeIvaAplicado` bien escrito, manteniendo el alias `porcentajeIvaApicado` (con el error tipográfico original) para no romper el frontend actual

> **Atención:** estos tres cambios de autenticación son incompatibles hacia atrás. Si el frontend llamaba esos endpoints sin token, empezará a recibir **401**.

---

## 9. Resumen

| Bloque                                      | Endpoints |
| ------------------------------------------- | --------- |
| Progreso de la Fase 1                       | 1         |
| Los 8 micromódulos (4 operaciones cada uno) | 32        |
| Archivos de la Fase 1                       | 4         |
| Cuentas bancarias del ente                  | 4         |
| Bibliotecas de normativa y cláusulas        | 20        |
| Datos entre corchetes                       | 4         |
| Documentos de ejemplo                       | 6         |
| **Total**                                   | **71**    |

Ver también [FASE1_MICROMODULOS.md](FASE1_MICROMODULOS.md) para el diseño, las migraciones de base de datos y las decisiones técnicas.
