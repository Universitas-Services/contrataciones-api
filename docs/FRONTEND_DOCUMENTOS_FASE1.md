# Guía Frontend — Documentos maestros de Fase 1 (Preparatoria)

**Audiencia:** equipo frontend (Frank)  
**Backend:** NestJS — módulos `fase1` + `generador-documentos`  
**Auth:** JWT Bearer en todos los endpoints (`Authorization: Bearer <access_token>`)

Este documento explica los **4 documentos Word** que el backend genera automáticamente en Fase 1, cuándo se habilitan en UI, qué APIs llamar y cómo integrarlos sin cambiar los formularios/micromódulos ya implementados.

---

## 1. Resumen ejecutivo

En Fase 1 el usuario completa micromódulos (formularios). Cuando las condiciones de negocio se cumplen, el frontend debe ofrecer botones para **generar / previsualizar / descargar** estos documentos:

| #   | Documento en UI                     | Clave en `progreso.documentos` | Tipo en BD                                         | Quién lo genera |
| --- | ----------------------------------- | ------------------------------ | -------------------------------------------------- | --------------- |
| 1   | Requerimiento / Actividades Previas | `actividades-previas`          | `ACTIVIDADES_PREVIAS`                              | Generador       |
| 2   | Pliego de Condiciones               | `pliego`                       | `PLIEGO_CONDICIONES` (+ registro `PliegoGenerado`) | Generador       |
| 3   | Acta de Inicio                      | `acta-inicio`                  | `ACTA_INICIO`                                      | Generador       |
| 4   | Llamado a Participar                | `llamado`                      | `LLAMADO_PARTICIPAR`                               | Generador       |

**Importante para frontend:**

- Los formularios de micromódulos **no cambian**. Siguen usando las mismas variables camelCase / DTOs actuales.
- El mapeo a tokens de plantilla Word (`{campo_au_au}`) lo hace **solo el backend** al generar el DOCX.
- El frontend **no** debe rellenar plantillas ni conocer tokens de Word. Solo orquesta: progreso → generar → preview/download.

---

## 2. Fuente de verdad del estado: `GET progreso`

```http
GET /expedientes/{expedienteId}/fase-preparatoria/progreso
Authorization: Bearer <token>
```

### 2.1 Respuesta relevante (forma conceptual)

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
    "pliego": "BLOQUEADO",
    "acta-inicio": "BLOQUEADO",
    "llamado": "BLOQUEADO"
  },
  "pliegoReady": false,
  "pliegoMissing": ["Aspectos Generales del Pliego", "..."],
  "phaseComplete": false,
  "totales": {
    "itemsPresupuesto": 2,
    "especificacionesCargadas": true
  }
}
```

### 2.2 Estados de cada documento (`documentos.*`)

| Estado           | Significado en UI                                        | Acción sugerida                          |
| ---------------- | -------------------------------------------------------- | ---------------------------------------- |
| `BLOQUEADO`      | Aún no se puede generar                                  | Botón deshabilitado + tooltip con motivo |
| `DISPONIBLE`     | Se puede generar por primera vez                         | Botón **Generar** habilitado             |
| `GENERADO`       | Ya existe archivo                                        | Botones **Ver / Descargar / Regenerar**  |
| `DESACTUALIZADO` | Existía, pero se reabrió un micromódulo y quedó obsoleto | Aviso + **Regenerar** destacado          |

### 2.3 Reglas de habilitación (gates)

```
actividades-previas  → DISPONIBLE cuando micromódulo "actividades-previas" = COMPLETADO

pliego               → DISPONIBLE cuando pliegoReady = true
                       (los 8 micromódulos estándar COMPLETADOS
                        + especificaciones técnicas cargadas
                        + al menos 1 ítem de presupuesto)
                       Si falta algo: usar pliegoMissing[] para el mensaje

acta-inicio          → DISPONIBLE cuando ya existe PliegoGenerado
                       (es decir, el Pliego ya se generó al menos una vez)

llamado              → DISPONIBLE cuando ya existe PliegoGenerado
                       (misma condición que Acta)
```

### 2.4 Fase 1 completa (`phaseComplete`)

Es `true` solo cuando:

1. `pliegoReady === true`
2. Pliego está en estado `GENERADO` o `DESACTUALIZADO` (no `BLOQUEADO` ni `DISPONIBLE`)
3. Acta de Inicio = `GENERADO`
4. Llamado = `GENERADO`

Usar esto para el check de “Fase 1 cerrada / lista para avanzar”.

---

## 3. Flujo recomendado en UI

```
┌─────────────────────────────────────────────────────────────┐
│  Pantalla Fase 1 — Documentos maestros                      │
│                                                             │
│  1. GET .../fase-preparatoria/progreso                      │
│  2. Pintar 4 cards según documentos[clave]                  │
│  3. Si DISPONIBLE / DESACTUALIZADO → Generar                │
│  4. Si GENERADO / DESACTUALIZADO → Preview + Download       │
│  5. Tras Generar → refrescar progreso                       │
└─────────────────────────────────────────────────────────────┘
```

Orden típico de generación (el backend lo refuerza con 400 si se salta):

1. **Requerimiento (Actividades Previas)** — apenas ese micromódulo esté completo.
2. **Pliego** — cuando `pliegoReady`.
3. **Acta de Inicio** y **Llamado** — en paralelo o en cualquier orden, **después** del Pliego.

---

## 4. Contratos de API por documento

Base del generador: `/generador-documentos`  
Todos requieren JWT.

### 4.1 Requerimiento / Actividades Previas

| Acción                              | Método | Ruta                                                                |
| ----------------------------------- | ------ | ------------------------------------------------------------------- |
| Preview tokens (opcional, debug/QA) | `GET`  | `/generador-documentos/actividades-previas/{expedienteId}/datos`    |
| Generar                             | `POST` | `/generador-documentos/actividades-previas/{expedienteId}/generar`  |
| Preview archivo                     | `GET`  | `/generador-documentos/preview/actividades-previas/{expedienteId}`  |
| Descargar                           | `GET`  | `/generador-documentos/download/actividades-previas/{expedienteId}` |

**Gate backend:** micromódulo `actividades-previas` = `COMPLETADO`. Si no → `400`.

**Respuesta de generar (envoltorio):**

```json
{
  "message": "Requerimiento de Actividades Previas generado y guardado exitosamente",
  "data": {
    "id": "uuid-documento",
    "url": "https://res.cloudinary.com/.../archivo.docx",
    "fileName": "actividades_previas-<expedienteId>-<timestamp>.docx",
    "tipoDocumento": "ACTIVIDADES_PREVIAS",
    "generatedAt": "2026-10-01T20:00:00.000Z"
  }
}
```

**Respuesta de datos (tokens mapeados):**

```json
{
  "message": "Datos del Requerimiento de Actividades Previas",
  "data": {
    "tokens": {
      "nom_ente_contratante": "...",
      "num_referencia_snc_au_au": "...",
      "requiere_van_au_au": "sí se incorporarán...",
      "activa_promocion_economica_au_au": true
    }
  }
}
```

> `GET .../datos` es útil para QA o un panel técnico. **No es obligatorio** en la UI de usuario final.

---

### 4.2 Pliego de Condiciones

| Acción          | Método | Ruta                                                               |
| --------------- | ------ | ------------------------------------------------------------------ |
| Preview tokens  | `GET`  | `/generador-documentos/pliego-condiciones/{expedienteId}/datos`    |
| Generar         | `POST` | `/generador-documentos/generar/pliego-condiciones/{expedienteId}`  |
| Preview archivo | `GET`  | `/generador-documentos/preview/pliego-condiciones/{expedienteId}`  |
| Descargar       | `GET`  | `/generador-documentos/download/pliego-condiciones/{expedienteId}` |

**Gate backend:** `pliegoReady` (mismas reglas que progreso). Si no → `400` con mensaje listando faltantes.

**Efecto lateral importante:** al generar Pliego el backend crea/actualiza:

1. `DocumentoGenerado` tipo `PLIEGO_CONDICIONES`
2. `PliegoGenerado` (tabla que usa el progreso para habilitar Acta y Llamado)

Sin este segundo registro, Acta y Llamado seguirían `BLOQUEADO` en `GET progreso`.

**Respuesta de generar:** misma forma (`id`, `url`, `fileName`, `tipoDocumento: "PLIEGO_CONDICIONES"`, `generatedAt`).

---

### 4.3 Acta de Inicio

| Acción          | Método | Ruta                                                        |
| --------------- | ------ | ----------------------------------------------------------- |
| Preview tokens  | `GET`  | `/generador-documentos/acta-inicio/{expedienteId}/datos`    |
| Generar         | `POST` | `/generador-documentos/generar/acta-inicio/{expedienteId}`  |
| Preview archivo | `GET`  | `/generador-documentos/preview/acta-inicio/{expedienteId}`  |
| Descargar       | `GET`  | `/generador-documentos/download/acta-inicio/{expedienteId}` |

**Gate backend:** debe existir Pliego generado. Si no → `400`:

```json
{
  "statusCode": 400,
  "message": "Debe existir un Pliego de Condiciones generado antes de elaborar el Acta de Inicio",
  "error": "Bad Request"
}
```

---

### 4.4 Llamado a Participar

| Acción          | Método | Ruta                                                               |
| --------------- | ------ | ------------------------------------------------------------------ |
| Preview tokens  | `GET`  | `/generador-documentos/llamado-participar/{expedienteId}/datos`    |
| Generar         | `POST` | `/generador-documentos/generar/llamado-participar/{expedienteId}`  |
| Preview archivo | `GET`  | `/generador-documentos/preview/llamado-participar/{expedienteId}`  |
| Descargar       | `GET`  | `/generador-documentos/download/llamado-participar/{expedienteId}` |

**Gate backend:** igual que Acta (pliego generado). Mensaje análogo mencionando “Llamado a Participar”.

---

## 5. Preview y descarga (detalle UI)

### 5.1 Preview

```http
GET /generador-documentos/preview/{tipo}/{expedienteId}
```

Respuesta típica:

```json
{
  "previewUrl": "https://docs.google.com/gview?url=...&embedded=true",
  "tituloDocumento": "Documento - Acta de Inicio",
  "urlArchivo": "https://res.cloudinary.com/.../archivo.docx",
  "tipoDocumento": "ACTA_INICIO"
}
```

**UI sugerida:**

- Abrir `previewUrl` en iframe/modal, **o**
- Abrir `urlArchivo` en nueva pestaña (descarga/apertura del DOCX).

Si el documento aún no existe → error 404; ocultar preview hasta `GENERADO` / `DESACTUALIZADO`.

### 5.2 Download

```http
GET /generador-documentos/download/{tipo}/{expedienteId}
Authorization: Bearer <token>
```

- Respuesta: **archivo binario** DOCX (`Content-Disposition: attachment`).
- En frontend: `fetch` con token → `blob` → disparar descarga con nombre sugerido.

Ejemplo conceptual (React):

```ts
async function descargarDoc(url: string, token: string, nombre: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('No se pudo descargar');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}
```

---

## 6. Implementación sugerida por componente

### 6.1 Hook / servicio

```ts
// Pseudocódigo
getProgresoFase1(expedienteId);
generarDocumento(tipo, expedienteId); // mapea tipo → POST correcto
previewDocumento(tipo, expedienteId);
downloadDocumento(tipo, expedienteId);
```

Mapa de rutas (mantener un solo diccionario):

```ts
const DOCS_FASE1 = {
  'actividades-previas': {
    generar: (id) => `POST /generador-documentos/actividades-previas/${id}/generar`,
    datos: (id) => `GET  /generador-documentos/actividades-previas/${id}/datos`,
    preview: (id) => `GET  /generador-documentos/preview/actividades-previas/${id}`,
    download: (id) => `GET  /generador-documentos/download/actividades-previas/${id}`,
  },
  pliego: {
    generar: (id) => `POST /generador-documentos/generar/pliego-condiciones/${id}`,
    datos: (id) => `GET  /generador-documentos/pliego-condiciones/${id}/datos`,
    preview: (id) => `GET  /generador-documentos/preview/pliego-condiciones/${id}`,
    download: (id) => `GET  /generador-documentos/download/pliego-condiciones/${id}`,
  },
  'acta-inicio': {
    generar: (id) => `POST /generador-documentos/generar/acta-inicio/${id}`,
    datos: (id) => `GET  /generador-documentos/acta-inicio/${id}/datos`,
    preview: (id) => `GET  /generador-documentos/preview/acta-inicio/${id}`,
    download: (id) => `GET  /generador-documentos/download/acta-inicio/${id}`,
  },
  llamado: {
    generar: (id) => `POST /generador-documentos/generar/llamado-participar/${id}`,
    datos: (id) => `GET  /generador-documentos/llamado-participar/${id}/datos`,
    preview: (id) => `GET  /generador-documentos/preview/llamado-participar/${id}`,
    download: (id) => `GET  /generador-documentos/download/llamado-participar/${id}`,
  },
} as const;
```

> Nota: Actividades Previas usa `.../actividades-previas/:id/generar`.  
> Pliego, Acta y Llamado usan el patrón histórico `.../generar/<nombre>/:id`.  
> Ambos son válidos; no unificar en frontend sin coordinar con backend.

### 6.2 Card de documento (UX)

Para cada clave en `progreso.documentos`:

| Estado           | UI                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `BLOQUEADO`      | Card gris, botón Generar disabled. Tooltip: si es pliego → listar `pliegoMissing`; si es acta/llamado → “Primero genera el Pliego”. |
| `DISPONIBLE`     | Botón primario **Generar documento**. Loading mientras POST.                                                                        |
| `GENERADO`       | Badge verde “Generado”. Acciones: Ver / Descargar / Regenerar.                                                                      |
| `DESACTUALIZADO` | Badge ámbar “Desactualizado”. Mensaje: “Hubo cambios en los micromódulos; regenera el documento.” Botón Regenerar destacado.        |

Tras **Generar** o **Regenerar**:

1. Esperar respuesta OK.
2. Volver a llamar `GET progreso`.
3. Actualizar cards.
4. Opcional: abrir preview automáticamente.

### 6.3 Errores a manejar

| HTTP  | Causa típica                                                               | Mensaje UI                                       |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| `400` | Gate no cumplido (micromódulo incompleto / sin pliego / pliegoReady false) | Mostrar `message` del backend tal cual           |
| `401` | Token inválido/expirado                                                    | Re-login                                         |
| `404` | Expediente o documento inexistente                                         | “Documento aún no generado”                      |
| `500` | Fallo plantilla/Cloudinary                                                 | “Error al generar; reintenta o contacta soporte” |

---

## 7. Relación con micromódulos (sin duplicar lógica)

Los documentos **leen** datos ya guardados. El frontend solo debe asegurar que el usuario complete micromódulos con el flujo existente:

| Documento           | Datos que alimentan (referencia)                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Actividades Previas | Micromódulo `actividades-previas` (+ unidad usuaria, modalidad UCAU, comisión, presupuesto si aplica) |
| Pliego              | Todos los micromódulos Fase 1 + especificaciones + presupuesto + cronograma + autoridad/comisión      |
| Acta de Inicio      | Comisión, unidad usuaria, modalidad, cronograma, viabilidad contrato marco, etc.                      |
| Llamado             | Micromódulo `llamado` (objetivos, retiro, costo/gratuito, hora) + cronograma + comisión               |

**No** hace falta enviar body en los `POST` de generar: el backend toma todo desde BD por `expedienteId`.

---

## 8. Regeneración y desactualización

- Si el usuario **reabre** un micromódulo y vuelve a completar, el backend marca documentos como `estaDesactualizado`.
- En `progreso`, eso se ve como `DESACTUALIZADO`.
- Regenerar = volver a llamar el mismo `POST` de generar (reemplaza archivo anterior y sube versión).

También existe:

```http
POST /generador-documentos/regenerar/{documentoId}
```

Puede usarse si la UI guarda el `id` del documento; si no, con el `POST` por `expedienteId` basta.

---

## 9. Checklist de implementación (Frank)

- [ ] Pantalla/sección “Documentos Fase 1” alimentada por `GET .../fase-preparatoria/progreso`
- [ ] 4 cards con estados `BLOQUEADO | DISPONIBLE | GENERADO | DESACTUALIZADO`
- [ ] Tooltip de bloqueo con `pliegoMissing` para Pliego
- [ ] Botón Generar → POST correspondiente → refresh progreso
- [ ] Botón Ver → preview (`previewUrl` o `urlArchivo`)
- [ ] Botón Descargar → GET download con blob + JWT
- [ ] Manejo de `400` mostrando `message` del API
- [ ] Loading/disabled mientras genera (el Pliego puede tardar más: plantilla grande)
- [ ] Tras Pliego generado, habilitar visualmente Acta y Llamado (vía progreso)
- [ ] Indicador de `phaseComplete` cuando los 4 documentos queden en orden

---

## 10. Swagger / prueba manual

1. Login → Authorize en Swagger (`/api/docs`).
2. Completar micromódulos (o usar expediente seed con Fase 1 completa).
3. `GET .../fase-preparatoria/progreso` y observar `documentos`.
4. Generar en orden: Actividades Previas → Pliego → Acta / Llamado.
5. Verificar download y que `phaseComplete` pase a `true` cuando Acta + Llamado estén `GENERADO`.

---

## 11. Contacto backend / notas

- Base path generador: `/generador-documentos`
- Base path progreso: `/expedientes/:expedienteId/fase-preparatoria`
- Roles típicos de escritura: `ADMIN_ENTE`, `EJECUTOR`, `UNIVERSITAS` (el generador usa JWT; el progreso aplica `RolesGuard` en Fase 1).
- Cualquier duda de tokens Word o mapeo: es responsabilidad del backend; frontend no debe duplicar esa lógica.

---

_Documento generado para integración frontend de los 4 documentos maestros de Fase 1. Actualizar este archivo si se unifican rutas de `generar` o se agregan webhooks/notificaciones._
