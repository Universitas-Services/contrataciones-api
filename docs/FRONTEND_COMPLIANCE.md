# Guía Frontend — Módulo de Compliance

**Para:** Frank (frontend)
**Rama backend:** `compliance`
**Auth:** JWT Bearer en todos los endpoints.
**Base:** `/compliance`

El módulo audita un expediente de contratación con el agente de compliance. La pantalla del expediente es un **chat con el «Coordinador de Compliance»** más la lista de documentos del checklist. Los botones son atajos: todo se puede hacer también conversando.

El backend habla con el agente; el frontend nunca lo llama ni ve su clave.

---

## 1. Permisos

| Rol                      | Qué puede hacer                                         |
| ------------------------ | ------------------------------------------------------- |
| `ADMIN_ENTE`, `EJECUTOR` | Todo, en los expedientes de su ente                     |
| `UNIVERSITAS`            | Todo, en cualquier ente                                 |
| `VISUALIZADOR`           | Solo leer los de su ente (no puede escribir en el chat) |
| `SUPERVISOR`             | Solo leer, en cualquier ente                            |

`GET /expedientes/:id` trae `puedeEditar`: úsalo para mostrar u ocultar el campo del chat y los botones. Es `false` para los roles de lectura y para expedientes cerrados.

---

## 2. Estados

**Expediente**

| Estado         | Significado                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `CONFIGURANDO` | Faltan nomenclatura, modalidad o tipo de contratación                   |
| `ACTIVA`       | Ya se pueden subir documentos y pedir dictámenes                        |
| `CERRADA`      | Tiene un dictamen FINAL. No se reabre. El chat sigue respondiendo dudas |

Pasa a `ACTIVA` solo, cuando están nomenclatura, modalidad y tipo (el nombre es opcional). Pasa a `CERRADA` solo, cuando termina un dictamen `FINAL`.

**Documento:** `PENDIENTE` → `PROCESANDO` → `ANALIZADO`, o `RECHAZADO` (el archivo no sirve) o `ERROR` (se puede reintentar). Mientras esté en `PENDIENTE` o `PROCESANDO`, muestra «Analizando…».

**Dictamen:** `PENDIENTE` → `PROCESANDO` → `LISTO` o `ERROR`.

---

## 3. Flujo de la pantalla

1. **Lista:** `GET /expedientes`. Botón «Nuevo» → `POST /expedientes`.
2. **Abrir:** `GET /expedientes/:id` y `GET /expedientes/:id/mensajes`. El primer mensaje ya es el saludo del Coordinador.
3. **Registrar:** el usuario conversa (`POST /expedientes/:id/mensajes`). Mientras falten modalidad o tipo, puedes mostrar botones con `GET /catalogo` que llamen a `PATCH /expedientes/:id`.
4. **Subir:** con el expediente en `ACTIVA`, muestra el botón para `siguienteDocumento`. `POST /expedientes/:id/documentos` responde al instante.
5. **Esperar el análisis:** consulta `GET /documentos/:documentoId` cada 5 s hasta que salga de `PENDIENTE`/`PROCESANDO`. Luego recarga mensajes y detalle: el resultado llega como mensaje del Coordinador.
6. **Dictamen:** botón o chat. `POST /expedientes/:id/dictamenes` y consulta `GET /dictamenes/:dictamenId` cada 5 s hasta `LISTO` o `ERROR`.

Un análisis normal tarda cerca de 1 minuto; un PDF escaneado, hasta 9. El dictamen de 12 documentos, cerca de minuto y medio.

---

## 4. Endpoints

| Método  | Ruta                                        | Rol de escritura | Para qué                                         |
| ------- | ------------------------------------------- | :--------------: | ------------------------------------------------ |
| `GET`   | `/catalogo`                                 |                  | Modalidades, tipos y checklist                   |
| `GET`   | `/expedientes?page=&limit=&search=&estado=` |                  | Lista paginada con progreso y riesgo             |
| `POST`  | `/expedientes`                              |        ✔         | Crear                                            |
| `GET`   | `/expedientes/:id`                          |                  | Detalle completo                                 |
| `PATCH` | `/expedientes/:id`                          |        ✔         | Botones de nomenclatura, nombre, modalidad, tipo |
| `GET`   | `/expedientes/:id/mensajes`                 |                  | Historial del chat                               |
| `POST`  | `/expedientes/:id/mensajes`                 |        ✔         | Enviar un mensaje                                |
| `POST`  | `/expedientes/:id/documentos`               |        ✔         | Subir un documento (multipart)                   |
| `GET`   | `/documentos/:documentoId`                  |                  | Estado de un documento                           |
| `POST`  | `/documentos/:documentoId/reintentar`       |        ✔         | Reanalizar un documento en `ERROR`               |
| `POST`  | `/expedientes/:id/dictamenes`               |        ✔         | Pedir dictamen                                   |
| `GET`   | `/dictamenes/:dictamenId`                   |                  | Dictamen con su Markdown                         |
| `GET`   | `/dictamenes/:dictamenId/pdf`               |                  | Descargar el PDF                                 |

### 4.1 `GET /catalogo`

```json
{
  "modalidades": [
    {
      "valor": "CA_ACTO_UNICO_APERTURA_UNICA",
      "nombre": "Concurso Abierto - Acto Único Apertura Única",
      "estado": "disponible",
      "checklist": [{ "tipo_documento": "ACTIVIDADES_PREVIAS", "nombre": "Actividades Previas" }]
    }
  ],
  "tipos_contratacion": [{ "valor": "BIENES", "nombre": "Bienes" }]
}
```

**Ofrece solo las modalidades con `estado: "disponible"`.** Hoy es una: Concurso Abierto Acto Único Apertura Única. Las demás responden 400.

### 4.2 `GET /expedientes`

**Paginado.** La respuesta es `{ metadata, data }`, como los demás listados del sistema.

| Parámetro | Uso                                                             |
| --------- | --------------------------------------------------------------- |
| `page`    | Página, desde 1. Por defecto 1                                  |
| `limit`   | Registros por página. Por defecto 10, máximo 100                |
| `search`  | Busca en nomenclatura o nombre, sin distinguir mayúsculas       |
| `estado`  | `CONFIGURANDO`, `ACTIVA` o `CERRADA`                            |
| `enteId`  | Solo para `UNIVERSITAS` y `SUPERVISOR`, que ven todos los entes |

Los demás roles ven solo su ente. Orden: los que tuvieron actividad más reciente primero.

```json
{
  "metadata": { "total": 37, "page": 1, "limit": 10, "totalPages": 4 },
  "data": [
    {
      "id": "uuid",
      "ente": { "id": "uuid", "nombre": "Alcaldía de Iribarren" },
      "nomenclatura": "CA-ALC-IRI-007-2026",
      "nombre": "Compra de mobiliario escolar",
      "modalidad": "CA_ACTO_UNICO_APERTURA_UNICA",
      "tipoContratacion": "BIENES",
      "estado": "ACTIVA",
      "progreso": { "cubiertos": 9, "total": 12 },
      "riesgo": {
        "fuente": "DICTAMEN",
        "rango": "Hallazgos Críticos",
        "nulidadAbsoluta": true,
        "semaforo": null
      },
      "createdAt": "…",
      "updatedAt": "…"
    }
  ]
}
```

- **Riesgo:** no se puede filtrar ni ordenar por él, porque se calcula al consultar.
- **Progreso:** tipos con un documento analizado y del tipo correcto, sobre el total del checklist. `null` si aún no hay modalidad.
- **Riesgo:** con dictamen, `fuente: "DICTAMEN"` con `rango` y `nulidadAbsoluta`. Antes del primer dictamen, `fuente: "DOCUMENTOS"` con el peor `semaforo` (`Verde`, `Amarillo` o `Rojo`). `null` si no hay nada analizado.

### 4.3 `POST /expedientes`

Body opcional: `{ "nomenclatura", "nombre", "modalidad", "tipoContratacion" }`. Lo normal es enviarlo vacío y dejar que el usuario los dé por el chat.

`UNIVERSITAS` no pertenece a un ente: **debe enviar `enteId`** o responde 400. Los demás usan el suyo.

Responde el mismo objeto que `GET /expedientes/:id`.

### 4.4 `GET /expedientes/:id`

```json
{
  "id": "uuid",
  "ente": { "id": "uuid", "nombre": "…" },
  "nomenclatura": "…",
  "nombre": "…",
  "modalidad": "CA_ACTO_UNICO_APERTURA_UNICA",
  "nombreModalidad": "Concurso Abierto - Acto Único Apertura Única",
  "tipoContratacion": "BIENES",
  "estado": "ACTIVA",
  "cerradoAt": null,
  "puedeEditar": true,
  "progreso": { "cubiertos": 2, "total": 12 },
  "riesgo": { "fuente": "DOCUMENTOS", "rango": null, "nulidadAbsoluta": null, "semaforo": "Rojo" },
  "siguienteDocumento": "PLIEGO_CONDICIONES",
  "checklist": [
    {
      "tipoDocumento": "ACTA_INICIO",
      "nombre": "Acta de Inicio",
      "admiteVarios": false,
      "documentos": [
        {
          "id": "uuid",
          "tipoDocumento": "ACTA_INICIO",
          "nombreArchivo": "acta.pdf",
          "urlArchivo": "https://…",
          "tamanoBytes": 123456,
          "estado": "ANALIZADO",
          "vigente": true,
          "estatusGlobal": "Rojo",
          "tipoCoincide": true,
          "tipoDetectado": null,
          "error": null,
          "createdAt": "…",
          "analizadoAt": "…",
          "reemplazadoAt": null
        }
      ]
    }
  ],
  "documentosReemplazados": [],
  "dictamenes": [
    {
      "id": "uuid",
      "estado": "LISTO",
      "forzarFinal": false,
      "alcance": "PARCIAL",
      "puntaje": {},
      "pendientes": [],
      "coherencia": [],
      "error": null,
      "createdAt": "…",
      "listoAt": "…"
    }
  ]
}
```

- **`siguienteDocumento`:** el tipo para el botón de subir. Si el Coordinador pidió uno por el chat, sale ese; si no, el primero del checklist sin cubrir. `null` si no está `ACTIVA` o ya está todo.
- **`checklist[].documentos`:** solo los vigentes. Los reemplazados van en `documentosReemplazados`.
- **No muestres** al usuario el informe técnico de cada documento: el backend no lo envía. Muestra el semáforo, el chat y el dictamen.

### 4.5 `PATCH /expedientes/:id`

Body: cualquiera de `nomenclatura`, `nombre`, `modalidad`, `tipoContratacion`.

| Respuesta | Cuándo                                                                                 |
| --------- | -------------------------------------------------------------------------------------- |
| 400       | Modalidad no disponible (el `message` trae el texto para mostrar) o código inexistente |
| 409       | Cambiar modalidad o tipo cuando ya hay documentos, o expediente cerrado                |

### 4.6 Chat

**`GET /expedientes/:id/mensajes`**

```json
[
  {
    "id": "uuid",
    "rol": "AGENTE",
    "texto": "Hola, Carlos…",
    "documentoId": null,
    "dictamenId": null,
    "createdAt": "…"
  },
  {
    "id": "uuid",
    "rol": "USUARIO",
    "texto": "Es el CA-ALC-IRI-007-2026",
    "documentoId": null,
    "dictamenId": null,
    "createdAt": "…"
  }
]
```

- `rol`: `USUARIO` o `AGENTE`. Todo lo del Coordinador va como `AGENTE`, también los avisos que agrega el backend («Analizando…», resultados, dictamen).
- `documentoId` o `dictamenId` vienen en los mensajes ligados a un documento o dictamen: sirven para poner un enlace.

**`POST /expedientes/:id/mensajes`** con `{ "mensaje": "…" }` (máximo 4000 caracteres).

Tarda de 5 a 15 s; el backend espera hasta 60 s. Muestra «escribiendo…» mientras tanto.

```json
{
  "mensajes": [
    { "id": "uuid", "rol": "USUARIO", "texto": "…" },
    { "id": "uuid", "rol": "AGENTE", "texto": "Registré el expediente. ¿Cuál es la modalidad?" }
  ],
  "acciones": [
    { "accion": "fijar_expediente", "nomenclatura": "CA-ALC-IRI-007-2026", "nombre": "…" },
    { "accion": "pedir_documento", "tipoDocumento": "ACTIVIDADES_PREVIAS" },
    { "accion": "solicitar_dictamen", "dictamenId": "uuid", "forzarFinal": false }
  ],
  "expediente": { "…": "mismo objeto que GET /expedientes/:id" }
}
```

- **`mensajes`:** agrégalos al chat en ese orden. Puede venir más de un mensaje del agente, por ejemplo el aviso de modalidad no disponible.
- **`expediente`:** reemplaza tu copia; ya trae los cambios de las acciones.
- **`acciones`:** las que el backend ya aplicó. No tienes que hacer nada con ellas, salvo empezar a consultar el dictamen si viene `solicitar_dictamen`.
- **Si responde 503** («No pude responder, intenta de nuevo»): el backend **no guardó** el mensaje. Muéstralo con un botón de reenviar y conserva el texto.
- **Expediente cerrado:** el chat sigue respondiendo dudas, pero las acciones se ignoran.

### 4.7 `POST /expedientes/:id/documentos`

`multipart/form-data`:

| Campo                  | Obligatorio | Descripción                                                  |
| ---------------------- | :---------: | ------------------------------------------------------------ |
| `archivo`              |      ✔      | El archivo                                                   |
| `tipoDocumento`        |      ✔      | Un `tipoDocumento` del checklist                             |
| `reemplazaDocumentoId` |             | Id del documento vigente que se reemplaza. Sin él, se agrega |

**Reemplazar o agregar:**

- Tipos con `admiteVarios: true` (hoy `OFERTAS`, `NOTIFICACION_ADJUDICADOS` y `NOTIFICACION_NO_ADJUDICADOS`: una por oferente): muestra dos botones, «Agregar» (sin `reemplazaDocumentoId`) y «Reemplazar» (con él).
- Los demás: si ya tienen un documento, solo «Reemplazar», con confirmación. Agregar responde 409.
- Al reemplazar, el anterior deja de contar para el progreso y el dictamen.

**Formatos:** `.pdf`, `.docx`, `.xlsx`, `.xls`, `.png`, `.jpg`, `.jpeg`, `.tif`, `.tiff`, `.webp`, `.bmp`. **Máximo 10 MB** por ahora (límite de Cloudinary gratis; subirá al cambiar de servidor). Valida ambos antes de subir.

Responde 201 con el documento en `PENDIENTE`. El chat ya tiene «Subí acta.pdf como Acta de Inicio.» y «Analizando acta.pdf…».

| Respuesta | Cuándo                                                                   |
| --------- | ------------------------------------------------------------------------ |
| 400       | Expediente aún en `CONFIGURANDO`, tipo fuera del checklist o sin archivo |
| 409       | Tipo de un solo archivo ya ocupado sin `reemplazaDocumentoId`, o cerrado |
| 413       | Archivo más grande que el máximo                                         |
| 415       | Formato no permitido                                                     |

**Cuando termine el análisis** (al salir de `PENDIENTE`/`PROCESANDO`), recarga mensajes y detalle:

| Resultado                             | Qué mostrar                                                     |
| ------------------------------------- | --------------------------------------------------------------- |
| `ANALIZADO` con `tipoCoincide: true`  | El semáforo (`estatusGlobal`)                                   |
| `ANALIZADO` con `tipoCoincide: false` | Aviso de archivo equivocado y botón «Reemplazar». No cuenta     |
| `RECHAZADO`                           | El motivo (`error`) y botón «Reemplazar»                        |
| `ERROR`                               | Botón «Reintentar» → `POST /documentos/:documentoId/reintentar` |

El Coordinador ya deja el mensaje correspondiente en el chat.

### 4.8 Dictamen

**`POST /expedientes/:id/dictamenes`** con `{ "forzarFinal": false }`.

- Sin `forzarFinal`: `PARCIAL` si falta algún documento; `FINAL` si están todos.
- Con `forzarFinal: true`: `FINAL` aunque falten. Pide confirmación: **un dictamen FINAL cierra el expediente para siempre.**

| Respuesta | Cuándo                                                                         |
| --------- | ------------------------------------------------------------------------------ |
| 400       | No hay ningún documento analizado, o el expediente no está `ACTIVA`            |
| 409       | Ya hay un dictamen en preparación, hay documentos analizándose, o está cerrado |

**`GET /dictamenes/:dictamenId`** trae además `markdown`: es el entregable. Puedes mostrarlo con un visor de Markdown (no trae tablas).

| Campo        | Uso                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `alcance`    | `PARCIAL` o `FINAL`                                                                                                     |
| `puntaje`    | `puntaje.global.porcentaje`, `puntaje.global.rango`, `puntaje.flag_nulidad_absoluta`                                    |
| `pendientes` | Tipos de documento que faltan                                                                                           |
| `coherencia` | Contradicciones entre documentos: `dato`, `documento_a`, `valor_a`, `documento_b`, `valor_b`, `gravedad`, `explicacion` |

**`GET /dictamenes/:dictamenId/pdf`** descarga el PDF. Responde 409 si aún no está `LISTO`.

---

## 5. Errores comunes

| HTTP | Significado                                  | Qué mostrar                           |
| ---- | -------------------------------------------- | ------------------------------------- |
| 401  | Sin sesión                                   | Volver al login                       |
| 403  | Rol de solo lectura u otro ente              | Ocultar la acción                     |
| 404  | No existe                                    | «No encontrado»                       |
| 503  | El agente no respondió o no está configurado | «No pude responder, intenta de nuevo» |

El `message` de cada error viene en español y se puede mostrar tal cual.

---

## 6. Dashboard del ente

El contador `compliance.total` de las métricas del ente ahora cuenta los expedientes de este módulo. Antes contaba los expedientes con Lista de Cotejo.
