# Fase 1 — Preparatoria por micromódulos

Documentación de la reestructuración de la Fase Preparatoria (Concurso Abierto /
Acto Único / Apertura Única) y de los 71 endpoints nuevos.

- **Alcance:** Gestión de Expedientes → Fase 1 → Concurso Abierto, Apertura Única
- **Base de datos:** 5 migraciones nuevas (`20260828_fase1_micromodulos`, `20260829_fix_declaratoria_desierto_not_null`, `20260830_bibliotecas_normativa_clausulas`)
- **Swagger:** `/api/docs`, tags _📋 Fase 1 — Preparatoria_, _🏦 Cuentas Bancarias del Ente_,
  y los cuatro de _📚/📜 Biblioteca_

---

## 1. Qué problema resolvía

El backend tenía **un único DTO monolítico** (`CreateFasePreparatoriaDto`) con ~25
campos, más el CRUD de ítems de presupuesto. Eso cubría cerca de un 30% de lo
que el frontend nuevo necesita.

El frontend, en cambio, ya está construido como un **panel de 10 micromódulos**
con estados de avance, guardado parcial y un control de dependencias que
determina cuándo se puede generar cada documento. Todo ese progreso vivía en
`localStorage`, lo que impedía trabajar desde varios dispositivos, auditar
quién cambió qué, y generar los documentos con datos reales.

La solución no fue agrandar el DTO existente, sino **darle al backend el mismo
modelo mental que ya tiene el frontend**: micromódulos con estado propio,
borrador y completado, y un endpoint que reporta el progreso de la fase.

---

## 2. Los 10 micromódulos

| #   | Micromódulo                    | Subpestaña               | Almacenamiento         |
| --- | ------------------------------ | ------------------------ | ---------------------- |
| 1   | Actividades Previas            | Preparatoria             | columnas               |
| 2   | Especificaciones Técnicas      | Preparatoria             | archivo (tabla propia) |
| 3   | Llamado                        | Preparatoria             | columnas               |
| 4   | Aspectos Generales del Pliego  | Preparatoria             | columnas               |
| 5   | Modelo de Contrato             | Preparatoria             | JSONB                  |
| 6   | Presupuesto Base               | Preparatoria             | tabla existente        |
| 7   | Calificación Legal             | Configuración del pliego | JSONB                  |
| 8   | Calificación Financiera        | Configuración del pliego | JSONB                  |
| 9   | Calificación Técnica           | Configuración del pliego | JSONB                  |
| 10  | Evaluación Técnica y Económica | Configuración del pliego | JSONB                  |

Los **8 con formulario** (todos menos Especificaciones y Presupuesto) llevan una
columna de estado con valores `PENDIENTE | BORRADOR | COMPLETADO`.

Los **2 especiales** derivan su estado de los datos: Especificaciones está
`COMPLETADO` si hay archivo cargado; Presupuesto lo está si tiene al menos un
ítem vigente.

---

## 3. Endpoints

### 3.1 Progreso de la fase

```
GET /expedientes/{expedienteId}/fase-preparatoria/progreso
```

El endpoint central: reemplaza el `localStorage` del frontend. Devuelve el
estado de los 10 micromódulos, el de los 4 documentos maestros, si el pliego
está listo para generarse, y qué falta si no lo está.

**Respuesta:**

```json
{
  "modalidad": "LICITACION_PUBLICA",
  "micromodulos": {
    "actividades-previas": "COMPLETADO",
    "llamado": "COMPLETADO",
    "aspectos-generales": "COMPLETADO",
    "modelo-contrato": "COMPLETADO",
    "calificacion-legal": "COMPLETADO",
    "calificacion-financiera": "COMPLETADO",
    "calificacion-tecnica": "COMPLETADO",
    "evaluacion-tecnica-economica": "COMPLETADO",
    "especificaciones-tecnicas": "COMPLETADO",
    "presupuesto-base": "COMPLETADO"
  },
  "documentos": {
    "actividades-previas": "DISPONIBLE",
    "pliego": "DISPONIBLE",
    "acta-inicio": "BLOQUEADO",
    "llamado": "BLOQUEADO"
  },
  "pliegoReady": true,
  "pliegoMissing": [],
  "phaseComplete": false,
  "totales": { "itemsPresupuesto": 2, "especificacionesCargadas": true }
}
```

Estados de documento: `BLOQUEADO` (aún no se cumplen los requisitos),
`DISPONIBLE` (se puede generar), `GENERADO`, `DESACTUALIZADO` (se editó un
módulo después de generarlo, hay que regenerarlo).

`pliegoMissing` viene con los nombres legibles de lo que falta, para mostrarlo
directamente en el tooltip del botón bloqueado.

### 3.2 Los 8 micromódulos con formulario

Todos siguen **el mismo patrón de cuatro operaciones**:

| Verbo  | Ruta                     | Qué hace                                                                                                     |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `GET`  | `.../{modulo}`           | Devuelve los datos guardados y el estado actual                                                              |
| `PUT`  | `.../{modulo}`           | Guarda borrador. Sin validaciones estrictas: permite datos parciales y deja el módulo en `BORRADOR`          |
| `POST` | `.../{modulo}/completar` | Valida todas las reglas de negocio y marca `COMPLETADO`. Si algo falla, devuelve 400 con la lista de errores |
| `POST` | `.../{modulo}/reabrir`   | Devuelve el módulo a `BORRADOR` para poder editarlo, y marca los documentos generados como desactualizados   |

Donde `{modulo}` es:

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

Prefijo completo: `/expedientes/{expedienteId}/fase-preparatoria/`

**Por qué borrador y completar están separados:** el usuario debe poder llenar
medio formulario, irse, y volver después. Si los campos fueran obligatorios en
el DTO, no podría guardar a medias. Por eso los DTOs tienen todos los campos
opcionales y **la exigencia vive en el validador del servicio**, que además
aplica reglas condicionales que las anotaciones no pueden expresar.

**Respuesta de error al completar:**

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

### 3.3 Especificaciones Técnicas (archivo)

```
GET    /expedientes/{expedienteId}/fase-preparatoria/especificaciones-tecnicas
POST   /expedientes/{expedienteId}/fase-preparatoria/especificaciones-tecnicas
DELETE /expedientes/{expedienteId}/fase-preparatoria/especificaciones-tecnicas
```

- `GET` — metadata del archivo (nombre, tipo, tamaño, URL, quién y cuándo lo subió).
- `POST` — `multipart/form-data` con el campo `file`. PDF o DOCX, máximo 10 MB.
  Solo se admite un archivo por expediente: subir otro reemplaza el anterior.
- `DELETE` — borrado lógico. El micromódulo vuelve a `PENDIENTE`.

Cualquiera de las tres operaciones marca los documentos generados como
desactualizados.

### 3.4 Documento modelo de recaudo personalizado

```
POST /expedientes/{expedienteId}/fase-preparatoria/calificacion-legal/modelos
```

Sube el archivo modelo (PDF/DOCX, máx 10 MB) que los oferentes descargarán para
un recaudo personalizado de la Calificación Legal. Devuelve `archivoModeloUrl`,
que el frontend debe guardar dentro del recaudo correspondiente en
`personalizados`.

Es obligatorio: al completar el micromódulo, todo recaudo con
`tieneModelo: true` debe tener esa URL.

### 3.5 Cuentas bancarias del Ente

```
GET    /entes/{enteId}/cuentas-bancarias
POST   /entes/{enteId}/cuentas-bancarias
PATCH  /entes/{enteId}/cuentas-bancarias/{id}
DELETE /entes/{enteId}/cuentas-bancarias/{id}
```

Registro de cuentas del Ente que alimenta la selección de cuenta de pago del
pliego en el micromódulo Llamado. Campos: banco, número de cuenta (≤20), tipo
de cuenta, titular y RIF. El `DELETE` es borrado lógico.

Lectura disponible para todos los roles; escritura solo para `ADMIN_ENTE` y
`UNIVERSITAS`.

### 3.6 Bibliotecas de Normativa y Cláusulas

Cuatro recursos en dos niveles, siguiendo la especificación de tablas del equipo:

| Nivel       | Recurso             | Tabla                          |
| ----------- | ------------------- | ------------------------------ |
| UNIVERSITAS | Normativa global    | `tb_normativa_global`          |
| UNIVERSITAS | Cláusulas genéricas | `tb_clausulas_genericas_ente`  |
| Ente        | Normativa del ente  | `tb_normativa_ente`            |
| Ente        | Cláusulas del ente  | `tb_biblioteca_clausulas_ente` |

**Nivel UNIVERSITAS** — lo administra Universitas y lo consultan todos los entes:

```
GET    /biblioteca/normativa-global
GET    /biblioteca/normativa-global/{id}
POST   /biblioteca/normativa-global
PATCH  /biblioteca/normativa-global/{id}
DELETE /biblioteca/normativa-global/{id}

GET    /biblioteca/clausulas-genericas
GET    /biblioteca/clausulas-genericas/{id}
POST   /biblioteca/clausulas-genericas
PATCH  /biblioteca/clausulas-genericas/{id}
DELETE /biblioteca/clausulas-genericas/{id}
```

**Nivel Ente** — cada ente administra la suya:

```
GET    /entes/{enteId}/normativa
GET    /entes/{enteId}/normativa/{id}
POST   /entes/{enteId}/normativa
PATCH  /entes/{enteId}/normativa/{id}
DELETE /entes/{enteId}/normativa/{id}

GET    /entes/{enteId}/clausulas
GET    /entes/{enteId}/clausulas/{id}
POST   /entes/{enteId}/clausulas
PATCH  /entes/{enteId}/clausulas/{id}
DELETE /entes/{enteId}/clausulas/{id}
```

**Campos.** La normativa guarda `textoNormativaCompleto` (el texto íntegro de la
norma); la global además lleva `indActivo` para retirarla sin borrarla. Las
cláusulas guardan `titulo` y `cuerpo` (HTML con marcadores `{variable_au_au}`
que el generador de documentos resuelve).

Las tablas usan nombres de columna con sufijo (`titulo_clausula_generica`,
`titulo_clausula_bib`); **la API los normaliza a `titulo` y `cuerpo`** en ambos
niveles, y agrega un campo `origen` (`generica` o `biblioteca`) para que el
frontend pueda mezclar las dos listas en el selector del Modelo de Contrato sin
transformar nada.

Todos los listados admiten paginación (`page`, `limit`) y búsqueda por texto
(`search`); la normativa global además filtra por `indActivo`.

**Permisos.** Escribir en el nivel UNIVERSITAS está restringido al rol
`UNIVERSITAS`; un `ADMIN_ENTE` que lo intente recibe **403**. En el nivel de
ente, cada ente sólo ve y modifica lo suyo: consultar la biblioteca de otro
ente devuelve **403**. `UNIVERSITAS` y `SUPERVISOR` pueden consultar la de
cualquiera. Los borrados son lógicos.

### 3.7 Documentos de Ejemplo

```
GET    /documentos-ejemplo              listar
GET    /documentos-ejemplo/{codigo}     consultar por código legible o UUID
POST   /documentos-ejemplo              cargar (multipart: nombre + imagen)
PATCH  /documentos-ejemplo/{id}         actualizar datos
PUT    /documentos-ejemplo/{id}/imagen  reemplazar sólo la imagen
DELETE /documentos-ejemplo/{id}         eliminar (borrado lógico)
```

Guías visuales que carga UNIVERSITAS para que los entes vean cómo debe quedar
cada documento mientras llenan los formularios.

Cada documento tiene un **código legible** (`documento-01`, `documento-02`) que
es la clave del diseño: el frontend pide la imagen de cada pantalla con
`GET /documentos-ejemplo/documento-02`, sin necesidad de conocer el UUID ni de
listar primero. El endpoint acepta ambos, así que el panel de administración
puede seguir usando el id.

Si al cargar no se envía código, se asigna **el siguiente de la serie**
automáticamente. Un código repetido devuelve **409**.

La carga es una sola llamada `multipart/form-data` con `nombre` y `file` (JPG,
PNG o WEBP, máximo 5 MB). Escribir está restringido a `UNIVERSITAS`; leer está
abierto a todos los roles, que es justamente el punto: los entes y ejecutores
consultan, no editan.

### 3.8 Presupuesto Base (ya existía, endurecido)

```
POST   /expedientes/{expedienteId}/presupuesto-items
GET    /expedientes/{expedienteId}/presupuesto-items
PATCH  /expedientes/presupuesto-items/{itemId}
DELETE /expedientes/presupuesto-items/{itemId}
GET    /expedientes/presupuesto-items          (listado global)
```

No son endpoints nuevos, pero cambiaron: ahora exigen autenticación, validan que
el expediente pertenezca al ente del usuario, el `DELETE` es **borrado lógico**
en vez de físico, y toda mutación **sincroniza `Expediente.totalPresupuesto`**
(antes ese campo nunca se actualizaba).

El listado global quedó restringido a `UNIVERSITAS` y `SUPERVISOR`.

La respuesta del listado ahora incluye `totales.porcentajeIvaAplicado` bien
escrito, manteniendo temporalmente el alias `porcentajeIvaApicado` (con el error
tipográfico original) para no romper el frontend actual.

---

## 4. Contratos de datos de los micromódulos JSONB

Cuatro micromódulos manejan **colecciones anidadas de tamaño variable**:
criterios con sus rangos, recaudos con claves dinámicas, cláusulas ordenadas.
Eso no cabe en columnas ni en un DTO plano, así que viajan bajo `data` y se
guardan en JSONB.

Swagger trae un ejemplo completo y válido de cada uno (copiable tal cual).

### Calificación Legal

```json
{
  "data": {
    "exigidos": { "modCartaOfertaAuAu": true, "modCertificadoRncAuAu": false },
    "sustitutos": { "sustitutoDjRifVigenteAuAu": true },
    "personalizados": [
      {
        "id": "p2",
        "sobre": 2,
        "descripcion": "Planilla de compromiso de abastecimiento local",
        "exigido": true,
        "tieneModelo": true,
        "archivoModeloUrl": "https://.../modelo.pdf"
      }
    ]
  }
}
```

El catálogo de 20 recaudos está fijo en el backend
(`src/fase1/constants/recaudos-legales.constants.ts`), de modo que la validación
no depende de lo que envíe el cliente.

### Calificación Técnica

```json
{
  "data": {
    "criterios": [
      {
        "nombre": "Experiencia acumulada",
        "puntuacion": 60,
        "rangos": [
          { "descripcion": "Igual o mayor a 10 años", "puntaje": 60 },
          { "descripcion": "Entre 5 y 9 años", "puntaje": 35 }
        ]
      },
      { "nombre": "Maquinaria propia", "puntuacion": 40, "rangos": [] }
    ],
    "puntuacionMinimaCalifTecnica": 70
  }
}
```

### Evaluación Técnica y Económica

Misma forma que Técnica, pero en dos bloques que **comparten una bolsa de 100
puntos**:

```json
{
  "data": {
    "tecnica":   { "criterios": [...], "puntuacionMinima": 25 },
    "economica": { "criterios": [...], "puntuacionMinima": 30 }
  }
}
```

### Calificación Financiera

```json
{
  "data": {
    "criterioCalifFinanDescapital": true,
    "puntajeMaximoDescapital": 20,
    "criterioCalifFinanSolvencia": true,
    "rangosSolvencia": {
      "rangoMaximo": 2.0,
      "puntajeMaximo": 20,
      "rangoMedioDesde": 1.2,
      "rangoMedioHasta": 1.9,
      "puntajeMedio": 12,
      "rangoMinimo": 1.0,
      "puntajeMinimo": 5
    },
    "criterioCalifFinanEndeudamiento": true,
    "rangosEndeudamiento": { "...": "rangos inversos" },
    "puntuacionMinimaCalifFinanciera": 60
  }
}
```

Criterios disponibles: `Descapital`, `Solvencia`, `Rotacion`, `Rendimiento`,
`Rentabilidad`, `Endeudamiento`.

### Modelo de Contrato

```json
{
  "data": {
    "clauses": [
      {
        "instanceId": "c1",
        "order": 1,
        "titulo": "Objeto del contrato",
        "cuerpoHtml": "<p>...{desc_objeto_contratacion_au_au}...</p>",
        "kind": "preceptiva",
        "origen": "generica"
      }
    ]
  }
}
```

---

## 5. Reglas de negocio que ahora impone el backend

Antes vivían solo en la interfaz. Ahora el servidor las verifica, así que no se
pueden saltar llamando la API directamente.

**Secuencia de la fase**

- Actividades Previas es la puerta de entrada: **ningún otro micromódulo se
  puede completar** hasta que esté `COMPLETADO`.
- Editar un módulo ya completado marca los documentos generados como
  desactualizados.
- Reabrir un módulo lo devuelve a `BORRADOR` e invalida los documentos.

**Hard gate del pliego**

- El pliego solo está `DISPONIBLE` cuando los 8 formularios están `COMPLETADO`,
  hay archivo de especificaciones y el presupuesto tiene al menos un ítem.
- Acta de Inicio y Llamado permanecen bloqueados hasta que el pliego exista.

**Actividades Previas**

- `proyectoAprobado` es obligatorio **solo si el expediente es de tipo OBRAS**.
- Si no permite PyMES, exige justificación. Si el contrato marco es viable,
  exige justificación.
- Con promoción económica activa: VAN entre 1 y 10; los bonos exigen puntuación
  mayor a 0.

**Llamado**

- Si el pliego tiene costo, son obligatorios el monto, banco, cuenta, titular y
  **RIF** del titular.

**Aspectos Generales**

- Porcentajes de CRS, mantenimiento de oferta, fiel cumplimiento y
  responsabilidad civil: entre 0 y 100.
- **Anticipo máximo 50%** (normal y especial).
- Moneda o idioma distintos exigen indicar cuál.

**Calificación Legal**

- Los 20 recaudos del catálogo deben estar respondidos SI/NO.
- Los sustitutos se exigen solo si el recaudo padre fue exigido.
- Al menos un recaudo exigido **por sobre**.
- Recaudo con `tieneModelo: true` exige el documento cargado.

**Calificación Financiera**

- Al menos un criterio activo.
- Rangos ascendentes (`máximo > hasta ≥ desde ≥ mínimo`), salvo endeudamiento
  que es **inverso** (`óptimo < desde ≤ hasta ≤ deficiente`).
- Puntuación mínima entre 1 y 100.

**Calificación Técnica**

- La suma de las ponderaciones debe ser **exactamente 100 puntos**.
- Ningún rango puede superar la puntuación de su criterio padre.
- La puntuación mínima no puede superar el total.

**Evaluación Técnica y Económica**

- Técnica + económica debe sumar **exactamente 100 puntos**.
- Mismas reglas de rangos y umbrales por bloque.

---

## 6. Seguridad

Este fue el hallazgo más serio del trabajo: **`fase-preparatoria` y
`presupuesto-items` estaban completamente abiertos**, sin JWT ni roles.
Cualquiera que conociera la URL podía leer y modificar datos de pliegos y
presupuestos de cualquier expediente de cualquier ente.

Lo corregido:

- `AuthGuard('jwt')` + `RolesGuard` en ambos módulos y en todo lo nuevo.
- Nuevo helper compartido `ExpedienteAccessService` que verifica que el
  expediente exista y pertenezca al ente del usuario. `UNIVERSITAS` y
  `SUPERVISOR` tienen acceso global; el resto queda acotado a su ente.
- El upsert de fase ahora sí registra `createdBy` / `updatedBy` (antes los
  dejaba nulos siempre).

**Roles por operación:**

| Operación                     | Roles                                                                 |
| ----------------------------- | --------------------------------------------------------------------- |
| Lectura (`GET`)               | `ADMIN_ENTE`, `EJECUTOR`, `UNIVERSITAS`, `VISUALIZADOR`, `SUPERVISOR` |
| Escritura (`PUT`/`POST`)      | `ADMIN_ENTE`, `EJECUTOR`, `UNIVERSITAS`                               |
| Cuentas bancarias (escritura) | `ADMIN_ENTE`, `UNIVERSITAS`                                           |

`VISUALIZADOR` queda en solo lectura, como pide la especificación.

> **Pendiente:** siguen sin protección `cronograma-expediente` y
> `modalidad-contratacion`. Se dejaron fuera de este cambio para no ampliar el
> riesgo del despliegue.

---

## 7. Cambios en la base de datos

### Migración `20260828_fase1_micromodulos`

- Enum nuevo `EstadoMicromodulo` (`PENDIENTE | BORRADOR | COMPLETADO`).
- Valor `ACTIVIDADES_PREVIAS` agregado al enum `TipoDocumento`.
- En `tb_fase_preparatoria`: 8 columnas de estado + `phase_complete_au_au`,
  22 campos de Actividades Previas, 21 de Aspectos Generales,
  `rif_pago_pliego_au_au`, y 5 columnas JSONB.
- Tabla nueva `tb_fase1_especificaciones` (metadata del archivo, 1:1 con la fase).
- Tabla nueva `tb_cuentas_bancarias_ente` (N:1 con el Ente).

Está escrita con `IF NOT EXISTS` en todo, así que es **idempotente**: volver a
correrla no rompe nada.

### Migración `20260829_fix_declaratoria_desierto_not_null`

Corrige un bug detectado al montar la base local: la migración
`20260727_add_declaratoria_desierto` creó `declaratoria_desierto_au_au`
**sin `NOT NULL`**, mientras el schema Prisma la declara obligatoria con default
`false`. La base y el modelo quedaban desalineados.

La corrección rellena los nulos con `false` antes de imponer la restricción, así
que es segura de aplicar sobre datos existentes.

> Como la migración original se aplicó a mano en producción, es probable que esa
> columna también esté nullable en Render.

### Migración `20260830_bibliotecas_normativa_clausulas`

Crea las 4 tablas de las bibliotecas: `tb_normativa_global`,
`tb_normativa_ente`, `tb_clausulas_genericas_ente` y
`tb_biblioteca_clausulas_ente`.

Los identificadores se describían como `Integer` en la especificación, pero las
claves foráneas apuntan a `Universitas.id` y `EntePublico.id`, que en este
esquema son UUID en formato TEXT. Se usa TEXT para conservar la integridad
referencial con el resto del modelo.

### Despliegue

El contenedor aplica las migraciones **automáticamente** al arrancar
(`Dockerfile`):

```
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

Es decir: al hacer push a `main`, Render reconstruye y migra solo. No hay que
correr SQL a mano en un despliegue normal.

---

## 8. Seed

`prisma/seed.ts` ahora crea los datos necesarios para probar Fase 1 completa:

- **`LP-GEM-SALUD-002-2024`** — los 8 micromódulos en `COMPLETADO` con datos que
  pasan todas las validaciones, especificaciones cargadas y 2 ítems de
  presupuesto. Sirve para probar el pliego listo y la generación de documentos.
- **`LP-GEM-OBRAS-007-2024`** — Fase 1 en cero, todo `PENDIENTE`, tipo OBRAS.
  Sirve para probar el flujo desde el arranque y las reglas propias de obras.
- 2 cuentas bancarias del Ente Miranda.
- Normativa: 5 globales (LCP Art. 55/101/113, RLCP Art. 68, SUNAI 24-b) + 2 del ente.
- Cláusulas: 7 genéricas (objeto, monto, plazo, garantía, anticipo, CRS, controversias) + 2 del ente.
- Documentos de ejemplo: 3 (documento-01 a documento-03).

Al terminar imprime los IDs y las URLs de progreso listas para pegar.

**Protección de entorno:** el seeder borra toda la base, así que **se niega a
ejecutarse si `DATABASE_URL` no apunta a un host local**. Para forzarlo hay que
pasar `SEED_FORCE=1` de forma explícita.

```bash
npm run seed
```

---

## 9. Scripts SQL

Carpeta nueva `scripts/sql/` para scripts que se ejecutan a mano contra una base
(normalmente producción), con su convención documentada en el README.

- `00_verificar_estado_migraciones.sql` — solo lectura. Muestra qué migraciones
  tiene registradas Prisma y verifica si los objetos de Fase 1 ya existen.
  **Ejecutarlo antes de desplegar:** si alguien aplicó SQL a mano sin
  registrarlo, `prisma migrate deploy` intentará repetirlo, fallará y el
  contenedor no arrancará.

---

## 10. Cambios que rompen compatibilidad

| Cambio                                                     | Impacto                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `fase-preparatoria` y `presupuesto-items` ahora exigen JWT | Si el frontend no manda token en esas llamadas, recibirá **401** |
| `GET /expedientes/presupuesto-items` restringido           | Solo `UNIVERSITAS` y `SUPERVISOR`                                |
| `DELETE` de ítems de presupuesto                           | Ahora es borrado lógico, no físico                               |

Sobre el primero: 25 de los 27 controllers del proyecto **ya exigían
autenticación**, incluido `expediente-contratacion`, que el frontend
necesariamente usa. Eso indica que el frontend ya envía el token de forma
global, y que el riesgo real de este cambio es bajo.

---

## 11. Decisiones de diseño

**Micromódulos JSONB en vez de tablas normalizadas.** Calificación Legal,
Financiera, Técnica, Evaluación T/E y Modelo de Contrato guardan estructuras
dinámicas anidadas. Normalizarlas habría significado unas 8 tablas más y mucho
más diseño inicial, para formularios que el frontend todavía puede ajustar. Con
JSONB la validación vive en el servicio y la entrega es mucho más rápida. Es
deuda técnica **declarada**: si más adelante hace falta reportería cruzada sobre
esos criterios, habrá que normalizar.

**El cuerpo va bajo `data`.** El proyecto tiene `forbidNonWhitelisted: true`
global, que rechaza propiedades no declaradas en el DTO. Como esas estructuras
tienen claves dinámicas, no se pueden declarar campo por campo. Envolverlas en
`data` da un contrato explícito y estable.

**Un solo DTO por módulo para borrador y completar.** Evita mantener dos DTOs
por micromódulo (16 en total) que inevitablemente se desincronizan. La
permisividad está en el DTO, la exigencia en el validador.

**`pliegoCosto` en vez de `pliegoGratuito` en la API nueva.** La base guarda
`pliegoGratuito` (nombre legacy, valor inverso) y el frontend nuevo trabaja con
`pliegoCosto`. El endpoint expone solo `pliegoCosto` y el servicio convierte, sin
renombrar la columna: así el wizard legacy sigue funcionando.

**El monolito legacy se mantiene.** `GET/POST/PATCH /fase-preparatoria/:id`
sigue operativo (solo se le agregó autenticación) para no romper el wizard
antiguo mientras el frontend migra. Su apagado hay que coordinarlo con el equipo
de front.

---

## 12. Pendientes

- **Plantillas `.docx`** de Actividades Previas, Pliego, Acta de Inicio y
  Llamado. La especificación trae los marcadores `{...au_au}`, pero faltan los
  archivos para conectar la generación al `generador-documentos` existente.
- **Proteger** `cronograma-expediente` y `modalidad-contratacion`.
- **Limpieza de archivos huérfanos**: los documentos modelo de recaudos se
  suben a Cloudinary y solo se guarda su URL en el JSON. Si se borra un recaudo,
  el archivo queda huérfano. Haría falta una tabla de registro para poder
  limpiarlos.
- **Apagado del wizard legacy**, a coordinar con el frontend.

---

## 13. Archivos

**Nuevos**

```
src/fase1/
  fase1.controller.ts              33 endpoints: progreso + 8 módulos × 4 operaciones
  fase1.service.ts                 leer/borrador/completar/reabrir + cálculo de progreso
  fase1.module.ts
  especificaciones.controller.ts   carga del archivo de especificaciones
  especificaciones.service.ts      + carga de modelos de recaudo
  recaudos-modelo.controller.ts    carga del documento modelo
  constants/micromodulos.constants.ts    registro de los 8 micromódulos
  constants/recaudos-legales.constants.ts catálogo de 20 recaudos
  validators/completar.validators.ts     todas las reglas de negocio
  dto/actividades-previas.dto.ts
  dto/llamado.dto.ts
  dto/aspectos-generales.dto.ts
  dto/modulo-json.dto.ts           5 DTOs documentados de los módulos JSONB

src/cuentas-bancarias/             CRUD de cuentas del ente
src/biblioteca/                    4 CRUD: normativa y cláusulas, global y por ente (20 endpoints)
                                   + catálogo de datos entre corchetes (4 endpoints)
src/documentos-ejemplo/            catálogo de guías visuales por código (6 endpoints)
src/common/common.module.ts
src/common/services/expediente-access.service.ts   control de acceso por ente
src/common/types/usuario-actual.type.ts

prisma/migrations/20260828_fase1_micromodulos/migration.sql
prisma/migrations/20260829_fix_declaratoria_desierto_not_null/migration.sql
prisma/migrations/20260830_bibliotecas_normativa_clausulas/migration.sql
prisma/migrations/20260831_documentos_ejemplo/migration.sql
scripts/sql/README.md
scripts/sql/00_verificar_estado_migraciones.sql
docs/FASE1_MICROMODULOS.md         este documento
```

**Modificados**

```
prisma/schema.prisma               enum, campos, 2 tablas nuevas
prisma/seed.ts                     datos de Fase 1 + protección de entorno
src/app.module.ts                  registro de los módulos nuevos
src/fase-preparatoria/*            autenticación + scoping + auditoría
src/presupuesto-item/*             autenticación + soft-delete + sync del total
```

> El tipo `UsuarioActual` debe importarse con `import type`. El proyecto usa
> `isolatedModules` + `emitDecoratorMetadata`, y sin eso TypeScript falla con
> `TS1272` en cualquier firma decorada.
