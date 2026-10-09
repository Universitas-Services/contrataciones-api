# Guía Frontend — Documentos de Fase 2 (Gestión de participantes)

**Audiencia:** equipo frontend (Frank)  
**Backend:** NestJS — módulos `adquiriente-pliego` + `generador-documentos`  
**Auth:** JWT Bearer en todos los endpoints (`Authorization: Bearer <access_token>`)

Este documento explica los documentos Word que el backend genera en Fase 2 (post-pliego). Hoy cubre:

1. **Registro de Adquirentes del Pliego**
2. **Acta de Recepción de Sobres**
3. **Acta de Apertura de Sobres**
4. **Informe de Recomendación Desierto #1** (causal “ninguna oferta”)
5. **Lista de Cotejo (Bienes)** — checklist vacío por oferente evaluado

---

## 1. Resumen ejecutivo

| #   | Documento en UI                     | Tipo en BD              | Gate UI / backend                         | Quién lo genera |
| --- | ----------------------------------- | ----------------------- | ----------------------------------------- | --------------- |
| 1   | Registro de Adquirentes del Pliego  | `REGISTRO_ADQUIRENTES`  | ≥1 adquirente                             | Generador       |
| 2   | Acta de Recepción de Sobres         | `ACTA_RECEPCION`        | Sin gate (tabla vacía a mano)             | Generador       |
| 3   | Acta de Apertura de Sobres          | `ACTA_APERTURA`         | Sin gate (tabla vacía a mano)             | Generador       |
| 4   | Informe Recomendación (Desierto #1) | `INFORME_RECOMENDACION` | desierto + causal 1                       | Generador       |
| 5   | Lista de Cotejo (Bienes)            | `LISTA_COTEJO`          | evaluación + ≥1 recaudo exigido en Fase 1 | Generador       |

**Importante para frontend:**

- Los CRUD de adquirentes / oferentes **no cambian**. Siguen usando camelCase / DTOs actuales.
- El mapeo a tokens Word (`{campo_au_au}`) lo hace **solo el backend**.
- El frontend **no** rellena plantillas. Solo orquesta: listar → generar → preview/download.
- En **Acta de Recepción** y **Acta de Apertura**, las tablas de oferentes/resultados del Word salen **vacías a propósito** (imprimir y llenar a mano en el acto).
- En **Lista de Cotejo**, las columnas Si/No/Observaciones salen **vacías**; las filas son solo los recaudos marcados exigidos en Fase 1 (no las respuestas SI/NO de la evaluación).

---

## 2. CRUD de adquirentes (fuente de filas)

Base: `/adquiriente-pliego`

| Acción                | Método   | Ruta                                            |
| --------------------- | -------- | ----------------------------------------------- |
| Crear                 | `POST`   | `/adquiriente-pliego`                           |
| Listar por expediente | `GET`    | `/adquiriente-pliego/expediente/{expedienteId}` |
| Ver uno               | `GET`    | `/adquiriente-pliego/{id}`                      |
| Actualizar            | `PATCH`  | `/adquiriente-pliego/{id}`                      |
| Eliminar (soft)       | `DELETE` | `/adquiriente-pliego/{id}`                      |

### 2.1 Body de creación (campos del formulario)

| Campo UI               | Propiedad DTO                        | Obligatorio       |
| ---------------------- | ------------------------------------ | ----------------- |
| Fecha de adquisición   | `fechaAdquisicion` (ISO date)        | Sí                |
| Nombre empresa         | `nombreProveedorAdquiriente`         | Sí                |
| Domicilio fiscal       | `direccionFiscalProveedorAdquirente` | Sí                |
| Teléfono               | `telefonoProveedorAdquirente`        | Sí                |
| Correo                 | `correoProveedorAdquirente`          | Sí (email válido) |
| Depósito/transferencia | `datosPagoPliego`                    | No                |
| Expediente             | `expedienteId`                       | Sí                |
| Proveedor (catálogo)   | `proveedorId`                        | No                |

### 2.2 Efecto lateral al crear / editar / eliminar

El backend marca el documento `REGISTRO_ADQUIRENTES` como **`estaDesactualizado: true`** si ya existía. En UI:

- Tras CRUD → si había documento generado, mostrar estado **DESACTUALIZADO** y ofrecer **Regenerar**.

---

## 3. Gate de generación

| Condición                    | Comportamiento UI               | Backend                     |
| ---------------------------- | ------------------------------- | --------------------------- |
| 0 adquirentes                | Botón Generar **deshabilitado** | `POST generar` → **400**    |
| ≥1 adquirente                | Botón Generar **habilitado**    | Genera OK                   |
| Ya generado + CRUD posterior | Mostrar **DESACTUALIZADO**      | `estaDesactualizado = true` |

Mensaje de error del gate (400):

> Debe registrar al menos un adquirente del pliego antes de generar el documento.

Toast sugerido al generar con éxito:

> Registro de adquirentes generado exitosamente.

---

## 4. Contratos del generador — Registro de Adquirentes

Base: `/generador-documentos`  
Todos requieren JWT.

| Acción                    | Método | Ruta                                                                 |
| ------------------------- | ------ | -------------------------------------------------------------------- |
| Preview tokens (QA/debug) | `GET`  | `/generador-documentos/registro-adquirentes/{expedienteId}/datos`    |
| Generar                   | `POST` | `/generador-documentos/generar/registro-adquirentes/{expedienteId}`  |
| Preview archivo           | `GET`  | `/generador-documentos/preview/registro-adquirentes/{expedienteId}`  |
| Descargar                 | `GET`  | `/generador-documentos/download/registro-adquirentes/{expedienteId}` |
| Regenerar por id          | `POST` | `/generador-documentos/regenerar/{documentoId}`                      |

### 4.1 Respuesta de generar

```json
{
  "message": "Registro de Adquirentes generado exitosamente",
  "data": {
    "id": "uuid-documento",
    "url": "https://res.cloudinary.com/.../archivo.docx",
    "fileName": "registro_adquirentes-<expedienteId>-<timestamp>.docx",
    "tipoDocumento": "REGISTRO_ADQUIRENTES",
    "generatedAt": "2026-10-05T18:00:00.000Z"
  }
}
```

### 4.2 Respuesta de datos (tokens)

```json
{
  "message": "Datos del Registro de Adquirentes",
  "data": {
    "tokens": {
      "cod_nomenclatura_proceso": "LP-001-2026",
      "desc_objeto_contratacion": "...",
      "datos_designacion_comision": "...",
      "adquirientes": [
        {
          "numero": 1,
          "fec_adquisicion_pliego_au_au": "01/10/2026",
          "nombre_proveedor_adquiriente_au_au": "EMPRESA, C.A.",
          "direccion_fiscal_proveedor_adquirente_au_au": "...",
          "telefono_proveedor_adquirente_au_au": "0251-123-4567",
          "correo_proveedor_adquirente_au_au": "contacto@empresa.com",
          "datos_pago_pliego_au_au": ""
        }
      ],
      "nom_completo_miembro_secretaria": "...",
      "cedula_miembro_secretaria": "..."
    }
  }
}
```

> `GET .../datos` es opcional en UI final; útil para QA. El frontend de usuario solo necesita generar / preview / download.

---

## 5. Flujo recomendado en UI

```
1. GET /adquiriente-pliego/expediente/{expedienteId}
2. Pintar tabla + sheet "Registrar adquirente"
3. Si count >= 1 → habilitar Generar / Actualizar en card Documentos
4. POST .../generar/registro-adquirentes/{expedienteId}
5. Toast éxito → GET preview o download
6. Si el usuario crea/edita/elimina filas → marcar card como DESACTUALIZADO y pedir regenerar
```

---

## 6. Acta de Recepción de Sobres

Documento del acto público de recepción. El backend rellena cabecera, comisión y firmas; **la tabla de oferentes queda en blanco** para llenado manual al imprimir.

### 6.1 CRUD de oferentes (no alimenta el Word)

Base: `/oferta-presentada`

| Acción                | Método   | Ruta                                           |
| --------------------- | -------- | ---------------------------------------------- |
| Crear                 | `POST`   | `/oferta-presentada`                           |
| Listar por expediente | `GET`    | `/oferta-presentada/expediente/{expedienteId}` |
| Ver uno               | `GET`    | `/oferta-presentada/{id}`                      |
| Actualizar            | `PATCH`  | `/oferta-presentada/{id}`                      |
| Eliminar (soft)       | `DELETE` | `/oferta-presentada/{id}`                      |

Campos del formulario (DTO): `rifProveedorOferente`, `nombreProveedorOferente`, `nombreRepLegalOferente`, `cedulaRepLegalOferente`, `numeroSobresEntregados`, `montoOfertaBs`, opcionales `datosRegistroMercantilProveedorOferente`, `correoProveedorOferente`, `proveedorId`.

> `montoOfertaBs` y registro mercantil **no** se imprimen en Recepción ni en Apertura (tablas vacías a mano); quedan en BD para otros docs / evaluación.

El CRUD de oferentes **no** marca `ACTA_RECEPCION` ni `ACTA_APERTURA` como desactualizadas (el Word no incluye oferentes).

### 6.2 Gate

**No hay gate de oferentes.** El botón Generar va siempre habilitado: el acta se imprime antes/durante el acto y la tabla se llena a mano. El backend no responde 400 por falta de oferentes (solo 404 si el expediente no existe).

Toast sugerido:

> Acta de Recepción de Sobres generada exitosamente.

### 6.3 Endpoints del generador

| Acción              | Método | Ruta                                                                  |
| ------------------- | ------ | --------------------------------------------------------------------- |
| Preview tokens (QA) | `GET`  | `/generador-documentos/acta-recepcion-sobres/{expedienteId}/datos`    |
| Generar             | `POST` | `/generador-documentos/generar/acta-recepcion-sobres/{expedienteId}`  |
| Preview archivo     | `GET`  | `/generador-documentos/preview/acta-recepcion-sobres/{expedienteId}`  |
| Descargar           | `GET`  | `/generador-documentos/download/acta-recepcion-sobres/{expedienteId}` |

### 6.4 Qué se automatiza vs qué va a mano

| Parte del Word                                                | Origen                                      |
| ------------------------------------------------------------- | ------------------------------------------- |
| Hora, fecha del acto, dirección, ente, nomenclatura, objeto   | Expediente / cronograma / fase preparatoria |
| Designación y miembros de la comisión (nombres + C.I.)        | Comisión del expediente                     |
| Tabla EMPRESA / RIF / REPRESENTANTE / CÉDULA / SOBRES / FIRMA | **Vacía** — llenado manual al imprimir      |

### 6.5 Flujo UI

```
1. Botón Generar Acta de Recepción siempre habilitado
2. POST .../generar/acta-recepcion-sobres/{expedienteId}
3. Preview / Download → imprimir y completar tabla a mano
4. (Independiente) Registrar oferentes en /oferta-presentada para evaluación / docs siguientes
```

---

## 7. Acta de Apertura de Sobres

Documento del acto público de apertura. El backend rellena cabecera, comisión y firmas; **la tabla de resultados queda en blanco** para llenado manual al imprimir (N°, empresa, RIF, representante, C.I., monto, observaciones).

### 7.1 Gate

Misma regla que la sección 6: **no hay gate de oferentes**. Botón Generar siempre habilitado; sin 400 por falta de oferentes.

Toast sugerido:

> Acta de Apertura de Sobres generada exitosamente.

### 7.2 Endpoints del generador

| Acción              | Método | Ruta                                                                 |
| ------------------- | ------ | -------------------------------------------------------------------- |
| Preview tokens (QA) | `GET`  | `/generador-documentos/acta-apertura-sobres/{expedienteId}/datos`    |
| Generar             | `POST` | `/generador-documentos/generar/acta-apertura-sobres/{expedienteId}`  |
| Preview archivo     | `GET`  | `/generador-documentos/preview/acta-apertura-sobres/{expedienteId}`  |
| Descargar           | `GET`  | `/generador-documentos/download/acta-apertura-sobres/{expedienteId}` |

### 7.3 Qué se automatiza vs qué va a mano

| Parte del Word                                                | Origen                                      |
| ------------------------------------------------------------- | ------------------------------------------- |
| Hora, fecha del acto, dirección, ente, nomenclatura, objeto   | Expediente / cronograma / fase preparatoria |
| Designación y miembros de la comisión (nombres + C.I.)        | Comisión del expediente                     |
| Tabla N° / EMPRESA / RIF / REP / C.I. / MONTO / OBSERVACIONES | **Vacía** — llenado manual al imprimir      |
| Bloque firmas empresas participantes                          | Líneas en blanco en la plantilla            |

### 7.4 Flujo UI

```
1. Botón Generar Acta de Apertura siempre habilitado (puede ser en paralelo a Recepción)
2. POST .../generar/acta-apertura-sobres/{expedienteId}
3. Preview / Download → imprimir y completar tabla / firmas a mano
```

---

## 8. Informe de Recomendación — Desierto #1

Cuando el expediente se declara desierto con la **causal 1** (ninguna oferta presentada), el mismo endpoint de Informe de Recomendación genera la plantilla Desierto #1.

### 8.1 Declarar desierto

```http
PATCH /expedientes/{expedienteId}/declarar-desierto
```

Body:

```json
{
  "causalDeclaratoriaDesierto": "1. Ninguna oferta haya sido presentada.",
  "justificacionDeclaratoriaDesierto": "Texto libre de justificación..."
}
```

Causales del desplegable (Art. 113 LCP):

| #   | Texto (preferido)                                         | Informe automatizado  |
| --- | --------------------------------------------------------- | --------------------- |
| 1   | `1. Ninguna oferta haya sido presentada.`                 | **Sí** (esta entrega) |
| 2   | `2. Todas las ofertas resulten rechazadas...`             | Pendiente (mañana)    |
| 3   | `3. Esté suficientemente justificado que de continuar...` | Pendiente (mañana)    |

### 8.2 Gate para generar Desierto #1

| Condición                                | Resultado                                |
| ---------------------------------------- | ---------------------------------------- |
| `declaratoriaDesierto = true` + causal 1 | Genera plantilla Desierto #1             |
| Desierto + causal 2 o 3                  | **400** (aún no disponible)              |
| Sin desierto                             | Usa el informe de adjudicación existente |

### 8.3 Endpoints (mismos paths; el backend elige plantilla)

| Acción              | Método | Ruta                                                                  |
| ------------------- | ------ | --------------------------------------------------------------------- |
| Preview tokens (QA) | `GET`  | `/generador-documentos/informe-recomendacion/{expedienteId}/datos`    |
| Generar             | `POST` | `/generador-documentos/generar/informe-recomendacion/{expedienteId}`  |
| Preview archivo     | `GET`  | `/generador-documentos/preview/informe-recomendacion/{expedienteId}`  |
| Descargar           | `GET`  | `/generador-documentos/download/informe-recomendacion/{expedienteId}` |

Tipo en BD: `INFORME_RECOMENDACION`.

Toast sugerido: `Informe de Recomendación generado exitosamente.`

### 8.4 Flujo UI

```
1. PATCH .../declarar-desierto con causal 1 + justificación
2. Habilitar Generar Informe de Recomendación (Desierto #1)
3. POST .../generar/informe-recomendacion/{expedienteId}
4. Preview / Download
```

> `pag_web_ente` aún no existe en el modelo del ente; el Word sale con `___` hasta que se agregue ese dato.

---

## 9. Lista de Cotejo (Bienes)

Checklist **vacío** por expediente (no requiere evaluación). Sirve para cotejar en el acto: el Word muestra solo el texto del recaudo; las columnas Si / No / Observaciones quedan en blanco. Los datos del oferente salen como `___` para ser llenados a mano el día del acto.

### 9.1 Qué filas aparecen

Fuente de verdad:

1. Micromódulo `calificacionLegalData` de Fase 1.

| Caso en Fase 1                       | En el Word                                       |
| ------------------------------------ | ------------------------------------------------ |
| Recaudo de catálogo exigido (`true`) | Fila visible (`{#mod_..._au_au}`)                |
| Recaudo no exigido / `false`         | Fila omitida                                     |
| N personalizados exigidos            | N filas en loop `desc_otro_recaudo_sobreX_au_au` |
| Oferta técnico-económica (Sobre 2)   | Siempre visible en este checklist vacío          |

### 9.2 Gate

| Condición                                                       | Resultado |
| --------------------------------------------------------------- | --------- |
| Ningún recaudo exigido en Fase 1 (catálogo + personalizados)    | **400**   |
| ≥1 recaudo exigido (además de la oferta técnico-económica fija) | Genera OK |

Mensaje 400 típico:

> No hay recaudos exigidos en la Calificación Legal de Fase 1 para generar la Lista de Cotejo.

Toast sugerido:

> Lista de Cotejo generada exitosamente.

### 9.3 Endpoints del generador

Requiere `expedienteId` (un solo Word por expediente).

| Acción              | Método | Ruta                                                         |
| ------------------- | ------ | ------------------------------------------------------------ |
| Preview tokens (QA) | `GET`  | `/generador-documentos/lista-cotejo/{expedienteId}/datos`    |
| Generar             | `POST` | `/generador-documentos/generar/lista-cotejo/{expedienteId}`  |
| Preview archivo     | `GET`  | `/generador-documentos/preview/lista-cotejo/{expedienteId}`  |
| Descargar           | `GET`  | `/generador-documentos/download/lista-cotejo/{expedienteId}` |

Tipo en BD: `LISTA_COTEJO` (asociado al expediente).

### 9.4 Tokens principales (respuesta de `/datos`)

Cabecera: `desc_objeto_contratacion`, `cod_nomenclatura_proceso`, `loc_ciudad_ente`, `fec_acto_recep_aper_sobres_au_au`, miembros de comisión (`cedula_miembro_juridico`, etc.), `datos_designacion_comision`. Los datos del proveedor (`nombre_proveedor_evaluado_au_au`, etc.) salen como `___`.

Visibilidad: booleanos `mod_*_au_au` + `oferta_tecnico_economica_au_au`.

Personalizados: arrays `desc_otro_recaudo_sobre1_au_au` / `desc_otro_recaudo_sobre2_au_au` con objetos `{ desc_otro_recaudo_sobreX_au_au: "descripción" }`.

### 9.5 Flujo UI

```
1. Tener configurado el micromódulo Calificación Legal en Fase 1
2. (Opcional QA) GET .../lista-cotejo/{expedienteId}/datos
3. POST .../generar/lista-cotejo/{expedienteId}
4. Preview / Download por expedienteId
5. Imprimir tantas copias como oferentes existan y llenarlas a mano en el acto
```

---

## 10. Próximos documentos

- Informe Desierto #2 y #3 (plantillas con loops a corregir + mapper de calificación/evaluación)
- Informe de adjudicación (cuando no hay desierto) — ya existe stub; refinar según prototipo final
