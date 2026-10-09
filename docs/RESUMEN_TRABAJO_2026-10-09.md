# Resumen del trabajo — 9 de octubre de 2026

Rama: `ajustes/1y2`

Hoy se trabajaron tres ajustes de **Fase 2**, más el cambio de base de datos que pidió documentación:

1. Acta de Recepción y Acta de Apertura sin oferentes.
2. Lista de Cotejo sin filas en blanco.
3. Informe de Recomendación **Desierto #2 y #3**, y el traslado de las preguntas de garantía y responsabilidad social al hub de Calificación Legal.

---

## 1. Acta de Recepción y Acta de Apertura sin oferentes

**Commit:** `0cf3e5b` — `fix(generador fase 2): permitir actas de recepcion y apertura sin oferentes`

### Problema

Frank no podía generar las actas. El backend respondía:

> Debe registrar al menos un oferente antes de generar el Acta de Recepción de Sobres.

La tabla de oferentes de estas actas sale **vacía a propósito**, para imprimirla y llenarla a mano en el acto. Por eso exigir oferentes registrados no tenía sentido.

### Qué se cambió

| Archivo                                                    | Cambio                                                                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/generador-documentos/generador-documentos.service.ts` | Se quitó la exigencia de oferentes en `getDatosActaRecepcionSobres` y `getDatosActaAperturaSobres`. Solo se valida que el expediente exista. |
| `src/oferta-presentada/oferta-presentada.service.ts`       | Crear, editar o borrar un oferente **ya no marca** las actas como DESACTUALIZADO, porque el Word no incluye oferentes.                       |
| `docs/FRONTEND_DOCUMENTOS_FASE2.md`                        | El botón Generar de ambas actas va siempre habilitado.                                                                                       |

> Si cambian datos de Fase 0 o Fase 1, del ente, de la comisión o del cronograma, las actas **sí** siguen marcándose como desactualizadas. Esos servicios tienen su propio marcado y no se tocaron.

---

## 2. Lista de Cotejo: borrar la fila completa

**Commit:** `53ef224` — `fix(generador fase 2): lista de cotejo elimina filas de recaudos no exigidos`

### Problema

Cuando un recaudo no se exigió en la Calificación Legal (NO), el documento borraba el texto pero dejaba la **fila vacía**.

### Causa

En la plantilla, la marca que abre `{#mod_x}` y la que cierra `{/mod_x}` estaban en la **misma celda**. Así, Docxtemplater (la librería que llena los Word) solo borra el párrafo.

### Qué se cambió (solo la plantilla `lista-cotejo-template.docx`)

- En las 23 filas de recaudos, la marca de cierre se movió a la **última celda** (Observaciones). Ahora Docxtemplater borra la fila entera.
- Los recaudos personalizados agregan una **fila completa** por cada uno.
- "Oferta técnico-económica" tenía su marca de apertura en el encabezado del Sobre 2. Se pasó a su propia fila para no arriesgar el encabezado.

No cambió el código, ni los endpoints, ni el frontend.

---

## 3. Informe de Recomendación — Desierto #2 y #3

**Estado:** implementado, **pendiente de commit**.

### Respuestas de documentación que se aplicaron

| Tema                                                             | Decisión                                                                                                                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Variables `antes`/`despues` y `desde`/`hasta`                    | Son la **misma variable**: una abre el bloque y la otra lo cierra.                                                                                    |
| Garantía de mantenimiento y Compromiso de Responsabilidad Social | Dejan de estar en el dictamen de adjudicación de Fase 3. Pasan al **Sobre 2 de la Calificación Legal** del hub, por oferente. Salen como **SÍ / NO**. |
| RIF, RNC y Evaluación de desempeño                               | Son recaudos legales como los demás: dependen de lo exigido en Fase 1 y llevan su texto.                                                              |
| Columnas Si/No por oferente                                      | Una **X** en la columna que corresponde.                                                                                                              |
| Columnas de bonos que no aplican (Desierto #3)                   | Quedan **vacías**.                                                                                                                                    |
| Columnas viejas de garantía/CRS                                  | Se **eliminan** del dictamen y del informe.                                                                                                           |

### 3.1 Base de datos — garantía y CRS al hub legal

**Migración nueva:** `prisma/migrations/20261009_verificacion_garantia_crs_hub/`

| Tabla                      | Cambio                                                            |
| -------------------------- | ----------------------------------------------------------------- |
| `tb_evaluacion_resultados` | **+** `ind_verificado_garantia_au_au`, `ind_verificado_crs_au_au` |
| `tb_dictamen_adjudicacion` | **−** esas dos columnas                                           |
| `tb_informe_recomendacion` | **−** esas dos columnas                                           |

> ⚠️ Al eliminar las columnas se pierden los valores que ya estuvieran guardados en dictámenes e informes. La migración se aplica sola al desplegar (`prisma migrate deploy` en el Dockerfile).

**API:**

- **Hub legal** (`PATCH /evaluacion-fase3/{evaluacionId}/hub/legal`): `form` recibe `indVerificadoGarantia` e `indVerificadoCrs` (boolean).
  - Son obligatorios al **confirmar** y opcionales en borrador.
  - No cambian si el oferente califica legalmente.
- **Dictámenes TOTAL/PARCIAL** e **informe de Fase 3:** ya **no** reciben esos campos.
- **Informe de adjudicación:** ahora lee garantía y CRS de la **evaluación del oferente adjudicado**.

### 3.2 Plantillas nuevas

`src/generador-documentos/templates/informe-desierto-2-template.docx` y `informe-desierto-3-template.docx` (a partir de los prototipos de documentación). Se corrigió lo siguiente:

- `{#X_despues}` pasa a ser el cierre `{/X_antes}`, y `{/X_hasta}` pasa a `{/X_desde}`. Es la misma convención que ya usa el Pliego.
- Las filas de recaudos y de criterios se borran o se repiten **completas**.
- RIF, RNC y Evaluación de desempeño quedaron como filas condicionales con su texto.
- Columnas Si/No: `{#var}X{/var}` en Si y `{^var}X{/var}` en No. El nombre de la variable no cambia.
- Typo `{rif_proveedor_evaluado_au_au}}`.
- **Solo #3:**
  - Se cerraron las secciones de VAN y PyME, que abrían y no cerraban.
  - En la tabla de totalización, los bonos se condicionan celda por celda.

### 3.3 Generación

- **Mapper nuevo:** `src/generador-documentos/mappers/informe-desierto.mapper.ts`. Lee el snapshot de plantillas y el estado del hub de cada oferente:
  - **#2:** oferentes del acto, requisitos preliminares (garantía/CRS), calificación legal, financiera, técnica y descalificados.
  - **#3:** todo lo del #2, más los oferentes que superaron la calificación, la evaluación técnica y económica, la promoción económica y la matriz de totalización.
  - Las matrices genéricas (criterios y rangos) salen de lo exigido en el Pliego, reutilizando `mapDatosPliegoCondiciones`.
- **`scoring.service.ts`:** `puntajeIndice` se exportó como función, para calcular los puntos financieros por índice con la misma regla del hub.
- **`generador-documentos.service.ts`:**
  - Nuevo `getDatosInformeDesierto23`.
  - Base común `datosBaseInformeDesierto`, compartida con el #1.
  - El endpoint de generar ahora elige la plantilla según la causal (1, 2 o 3).
- **Requisito para las causales 2 y 3:** al menos un oferente con la Calificación Legal **confirmada** en el hub. Si no, responde **400**.

**Endpoints (los mismos de siempre):**

| Acción     | Método | Ruta                                                                  |
| ---------- | ------ | --------------------------------------------------------------------- |
| Datos (QA) | `GET`  | `/generador-documentos/informe-recomendacion/{expedienteId}/datos`    |
| Generar    | `POST` | `/generador-documentos/generar/informe-recomendacion/{expedienteId}`  |
| Preview    | `GET`  | `/generador-documentos/preview/informe-recomendacion/{expedienteId}`  |
| Descargar  | `GET`  | `/generador-documentos/download/informe-recomendacion/{expedienteId}` |

### 3.4 Guías actualizadas para Frank

- `docs/FRONTEND_DOCUMENTOS_FASE2.md` — §8 (causales 2 y 3) y **§8.5** (cómo enviar garantía/CRS en el hub legal).
- `docs/FRONTEND_GESTION_FASE3.md` — los dictámenes ya no piden garantía ni CRS.

### 3.5 Verificación realizada

- `tsc` y `eslint` sin errores en los módulos tocados.
- Las dos plantillas cargan en Docxtemplater sin error, con todas las marcas emparejadas.
- Render de prueba con 2 oferentes (uno descalificado) y promoción activa:
  - La X sale en la columna correcta.
  - Los puntajes se calculan bien.
  - Las columnas de bonos que no aplican salen vacías.
- La migración está aplicada en la base local.
- **Pendiente:** probar con la API real un expediente evaluado en el hub, porque el seed no trae datos del hub.

---

## Pendientes

1. **Commit** de la parte 3 (Desierto #2/#3 y la migración), push de `ajustes/1y2`, merge a `main` y redeploy.
2. **Frontend (Frank):** mover las dos preguntas de garantía/CRS del dictamen de Fase 3 al **Sobre 2 de la Calificación Legal** del hub.
3. Prueba de punta a punta con un expediente real evaluado en el hub y declarado desierto con causal 2 y con causal 3.
4. `pag_web_ente` sigue saliendo como `___`, porque el modelo del ente no tiene ese campo.
