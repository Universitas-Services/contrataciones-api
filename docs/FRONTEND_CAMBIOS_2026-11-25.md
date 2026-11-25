# Cambios del backend del 25 de noviembre de 2026 — para Carlos (frontend)

Backend desplegado: PR 82 de `contrataciones-api`, commit `24faad6`. Responde a los puntos 12 a 28 de `docs/API_AJUSTES_QA.md`, el documento que Frank dejó en el repositorio del frontend.

Las rutas de este documento son del repositorio `Gestor-de-Contrataciones-Publicas`, rama `dev`, commit `3e56d09` (el último de Frank, 24 de noviembre). Nada de la sección 1 está hecho todavía en el frontend.

**Nada se rompe mientras tanto:** la subida directa con el token de sesión y la cédula en solo números siguen funcionando.

## Resumen

| Prioridad | Qué hacer en el frontend                                  | Punto   |
| --------- | --------------------------------------------------------- | ------- |
| Alta      | Usar el token corto al subir archivos grandes             | 12      |
| Alta      | Mostrar qué pasó de verdad al registrar un feriado        | 19      |
| Media     | Enviar la cédula del proveedor con su letra               | 25      |
| Media     | Pedir confirmación antes de «Generar contrato definitivo» | —       |
| Baja      | Comprobar que se vean los mensajes nuevos de error        | 22 y 24 |
| Baja      | Comprobar los textos de la rúbrica financiera             | 20      |

---

## 1. Lo que hay que hacer

### 1.1 Token corto de subida (12)

**Por qué.** Los archivos de más de 4 MB no caben en una server action de Netlify, así que el navegador los sube directo al API. Hoy se le entrega el token de sesión, que dura 24 horas.

**Endpoint nuevo.** `POST /auth/token-subida`, con el token de sesión y sin cuerpo.

```json
{ "token": "eyJ...", "expiraEnSegundos": 120 }
```

Solo sirve en estas cinco rutas; en cualquier otra responde 401:

- `POST /proveedores`
- `PATCH /proveedores/:id`
- `POST /compliance/expedientes/:id/documentos`
- `POST /expedientes/:expedienteId/fase-preparatoria/especificaciones-tecnicas`
- `POST /expedientes/:expedienteId/fase-preparatoria/calificacion-legal/modelos`

**Cambio.** En `src/services/acciones/subidaDirecta.ts`, `obtenerTokenDeSubida` debe pedir el token al API desde el servidor y devolver ese, nunca el de sesión.

- Pedir uno nuevo en cada subida; no guardarlo.
- Si el endpoint falla, mostrar el error. No usar el token de sesión como respaldo.
- `subirDirecto` (`src/lib/utils/subidaDirecta.ts`) no cambia.
- Si agregas otra subida directa, avísanos: hay que sumar la ruta en el backend.

### 1.2 Feriados (19)

**Antes.** Un feriado corría todas las fechas posteriores de todos los expedientes activos.

**Ahora**, al crear un feriado (uno o varios):

| Situación                                                                            | Qué hace el backend                                                                                         |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Cae fuera del cronograma, en fin de semana o en un día que ya era feriado            | Nada                                                                                                        |
| Cae dentro y el llamado aún no sale                                                  | Corre un día hábil las fechas iguales o posteriores y marca desactualizados los documentos que las imprimen |
| Cae dentro, pero el llamado es de hoy o anterior, o el expediente está en evaluación | **Solo avisa**: no mueve nada                                                                               |

Nunca mueve fechas pasadas. Editar un feriado no recalcula, y borrarlo no devuelve las fechas.

**Respuesta.** Cada elemento de `conflictosDetectados` trae dos datos nuevos, `soloAviso` y `fechaNueva`:

```json
{
  "expedienteId": "…",
  "codigoNomenclatura": "…",
  "descripcionObjeto": "…",
  "estatusProceso": "EN_PREPARACION",
  "soloAviso": false,
  "camposAfectados": [
    {
      "campo": "fechaActoRecepcionAperturaSobres",
      "etiqueta": "Acto de Recepción de Ofertas",
      "fechaAnterior": "2026-12-10",
      "fechaNueva": "2026-12-11"
    }
  ]
}
```

Con `soloAviso: true`, `fechaNueva` es igual a `fechaAnterior`.

**Cambios.**

- `src/types/cronogramaEnte.types.ts`: agregar `soloAviso: boolean` y `fechaNueva: string`.
- `src/components/features-components/Configuracion/DiasNoLaborables/ConflictosDialog.tsx`:
  - Columna «Fecha nueva».
  - El texto actual («fechas que caen en días no laborables») ya no es exacto. Con `soloAviso: false`: «Las fechas se corrieron un día hábil; regenere los documentos». Con `soloAviso: true`: «El llamado ya salió: las fechas **no** se movieron, revise el cronograma».
  - En el registro masivo, el mismo expediente y campo pueden venir una vez por feriado. La `key` actual (`expedienteId-campo`) se repetiría: incluir el índice o agrupar.

### 1.3 Cédula del proveedor (25)

`cedulaNaturalProveedor` y `cedulaAutoridadProveedor` pasaron de entero a **texto**.

- Aceptan `V-12345678`, `E-12345678`, `P-12345678` o solo números. Otro formato: 400.
- Se devuelven como se guardaron. Las anteriores vienen **sin letra**; `formatCedulaFromApi` ya las muestra con `V-`.
- Si llega la misma cédula sin letra, el backend conserva la letra guardada.

**Cambios** en `src/lib/proveedores/buildProveedorFormData.ts` (líneas 147, 155, 269 y 280):

- Usar `extractCedulaWithPrefix` (ya existe en `proveedor.constants.ts`) en vez de `extractCedulaDigits`.
- También al comparar con el valor inicial en la edición: hoy compara solo números, y cambiar de V a E no se enviaría.
- Actualizar `buildProveedorFormData.test.ts`, que espera `"9999999"` y `"8888888"`.
- Quitar el comentario «El API recibe esta cédula… como entero».

### 1.4 Confirmar antes de generar el contrato

En `src/components/features-components/GestionExpedientes/fase4/ContratoGeneradorView.tsx`, el botón «Generar contrato definitivo» llama a `handleGenerate()` sin preguntar. Falta un diálogo de confirmación. El backend no cambió.

### 1.5 Mensajes nuevos de error (22 y 24)

Ambos son 400 y traen el texto en `message`. Comprobar que se vea.

| Caso                                                                      | Mensaje                                                                                                     |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Declarar desierto por «Ninguna oferta…» con ofertas registradas           | «No puede usar la causal «Ninguna oferta haya sido presentada»: el expediente tiene 2 ofertas registradas.» |
| Archivo que no es PDF, al crear o editar un proveedor (no se guarda nada) | «Este archivo no es un PDF válido: «rnc.pdf».»                                                              |
| El almacenamiento rechaza el archivo                                      | «No se pudo guardar el archivo «rnc.pdf». Verifique que sea un PDF válido y vuelva a intentarlo.»           |

### 1.6 Rúbrica financiera (20)

El API ya dice Solvencia = Activo Circulante / Pasivo Circulante y Rotación = Ventas / Cuentas por Cobrar, igual que Fase 1. También en las evaluaciones ya iniciadas, sin cambiar sus rangos.

Comprobar que la pantalla de evaluación lea `titulo`, `pregunta` y `aspectoHint` del API y no los de `src/lib/constants/calificacionFinancieraEvaluacion.ts`.

### 1.7 Valor unitario del UCAU (segundo despliegue, migración `20261125_valor_ucau`)

`valorUcauBase` es el **monto** convertido a UCAU. El dato nuevo `valorUcau` es lo que vale **1 UCAU en Bs.** (`valor` de `GET /api/v1/economia/ucauu` del API global).

- Opcional, número positivo. Se acepta al crear (`POST /expedientes/borrador` y los de concurso cerrado, consulta de precios, contratación directa y modalidad excluida) y en `PATCH /expedientes/:id`. Antes de este despliegue, enviarlo da 400.
- Enviarlo al crear, en `CrearExpedienteWizard.tsx` (ya está en el dictamen que arma `CalculoModalidadStep.tsx`), y al recalcular la tasa, en `MontoEstimadoCard.tsx`.
- Si se editan los montos sin `valorUcau`, el guardado se descarta y se calcula con los montos.
- Actividades Previas ya imprime el valor unitario, también en expedientes anteriores al regenerarla.

---

## 2. Lo que cambió sin trabajo en el frontend

| Punto | Ahora                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| 14    | `PUT /expedientes/:id/cronograma` funciona con UNIVERSITAS y usa los feriados del ente del expediente                        |
| 15    | Si falla la generación de un documento, se conserva el anterior                                                              |
| 16    | `gates.notificacionesGeneradas` no cuenta las desactualizadas                                                                |
| 17    | En el pliego, «&» y las comillas de las cláusulas ya no salen como `&amp;` o `&quot;`                                        |
| 18    | Sin delegado, su cédula anterior ya no da «cédula repetida»                                                                  |
| 21    | Al revertir el desierto se retira su informe. Los revertidos antes de este cambio se corrigen al generar el informe de nuevo |
| 26    | En adjudicación parcial, Fase 4 muestra la misma opción que Fase 3                                                           |
| 27    | La pregunta del recaudo personalizado conserva las mayúsculas (evaluaciones nuevas)                                          |

---

## 3. Lo que sigue abierto

| Punto | Estado                                                                                                              | Quién                          |
| ----- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 13    | Si el EJECUTOR puede registrar normativas del ente                                                                  | QA                             |
| 20    | Artículo del basamento: el API dice Art. 45 y las constantes del frontend, Art. 67                                  | QA                             |
| 23    | «CONTRATO MARCO» y «Entre el» fijos en el contrato: es texto de plantilla                                           | Documentación                  |
| 27    | «REQUERIMIENTO DE FECHA:» vacío en Actividades Previas: falta un Word de ejemplo                                    | QA                             |
| 27    | Punto decimal del informe: se queda como está                                                                       | —                              |
| 28    | `CORS_ALLOWED_ORIGINS` del API global (tasa BCV, UCAU, territorio) con el dominio de Netlify. No es de este backend | Quien administra el API global |

**Sobre las plantillas:** el texto de los documentos no se modifica sin aprobación de documentación.

**Despliegue del frontend, por confirmar:** los cambios de Frank están en `dev`; su `main` es de mayo. Antes de publicar hay que saber qué rama usa Netlify. Además, `NEXT_PUBLIC_UNIVERSITAS_SDK_URL` debe ser la URL base, sin `/api/v1`; las variables `NEXT_PUBLIC_*` exigen volver a desplegar.

---

## 4. Cómo probar

- [ ] Subir un PDF de más de 4 MB en proveedores, compliance, especificaciones técnicas y modelos de recaudos. En la pestaña Red, el token del navegador no es el de sesión.
- [ ] Registrar, **en un ente de prueba**, un feriado dentro de un cronograma futuro: se ve fecha anterior y nueva.
- [ ] Lo mismo con un llamado ya pasado: el aviso dice que no se movió nada.
- [ ] Registrar varios feriados a la vez: sin filas duplicadas ni avisos de `key` en la consola.
- [ ] Crear un proveedor natural con E: al volver a abrirlo sigue con E. Editarlo de E a V: se guarda.
- [ ] Subir un archivo renombrado a `.pdf`: se ve el nombre del que falló.
- [ ] Declarar desierto por «Ninguna oferta» con ofertas registradas: se ve el mensaje.
- [ ] «Generar contrato definitivo» pide confirmación.
- [ ] `npm test`, `npm run lint` y `npm run build`.

## 5. Dónde está lo demás

| Documento (en `contrataciones-api/docs`)    | Para qué                                                         |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `AJUSTES_QA_2026-11.md`                     | Historial de las rondas de QA; la sección 5 resume estos cambios |
| `FRONTEND_COMPLIANCE.md`                    | Compliance                                                       |
| `FRONTEND_DOCUMENTOS_FASE1.md` a `FASE4.md` | Documentos de cada fase                                          |
| `FRONTEND_GESTION_FASE3.md`                 | Adjudicación                                                     |
| `FASE4_FORMALIZACION_GESTION.md`            | Contratos y decaimiento                                          |
