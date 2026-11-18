# Ajustes de QA — noviembre de 2026

**Para:** Frank (frontend)
**Rama backend:** `fix/ajustes-qa`
**Responde a:** `API_AJUSTES_QA.md` y al documento "Testeo QA App Contrataciones Públicas Concurso Abierto"

> Incluye una migración (`20261117_ajustes_qa`) que se aplica sola al desplegar con `prisma migrate deploy`.

---

## 1. Resumen

| #     | Pedido                                    | Estado                                          |
| ----- | ----------------------------------------- | ----------------------------------------------- |
| 1     | Contraseña con cualquier símbolo          | ✅                                              |
| 2     | Ejecutor lee los actores                  | ✅                                              |
| 3     | Justificaciones más largas                | ✅ **Límite: 2000 caracteres**                  |
| 4     | Porcentajes con límites legales           | ✅                                              |
| 5     | Quitar el umbral mínimo                   | ✅                                              |
| 6     | «Ver modelo» en Calificación legal        | ⏳ Se cargan desde el panel; no requiere código |
| 7     | Parroquia «Ana Soto»                      | ➖ Es del API global de Universitas             |
| 8     | Documentos desactualizados sin cambios    | ✅                                              |
| 9     | Normativas del pliego                     | ✅                                              |
| 10    | Página web del ente                       | ✅                                              |
| 11    | Recaudos de Calificación legal            | ✅                                              |
| Extra | Moneda e idioma en el pliego              | ✅ Textos de la documentación                   |
| Extra | Cronograma calculado por `UNIVERSITAS`    | ✅ Antes respondía 500                          |
| 12    | Marcas `{…}` del Modelo de Contrato       | ✅ Ver §2.12                                    |
| 13    | Bonos local y sujeto en el pliego         | ✅ Salían `___`                                 |
| 14    | Numeración de ítems del presupuesto       | ✅ `{numero_item_au_au}`                        |
| 15    | Cláusulas en mayúscula en el pliego       | ✅                                              |
| 16    | Páginas y renglones en blanco (Anexo III) | ✅                                              |
| 17    | Textos del prototipo de documentación     | ✅ "N°", "la ciudad", "En ciudad \_\_\_\_"      |
| Extra | Contraseñas en los logs                   | ✅ Ver §2.14                                    |

---

## 2. Cambios que el frontend debe conocer

### 2.1 Contraseña al crear usuarios del ente

`POST /entes/:id/usuarios` acepta cualquier símbolo: todo carácter que no sea letra ni número cuenta como especial. Sigue exigiendo mínimo 8 caracteres, mayúscula, minúscula y número.

### 2.2 Actores para el EJECUTOR

`GET /maxima-autoridad`, `/comision-contrataciones` y `/unidad-usuaria`, y sus `GET /:id`, ahora aceptan `EJECUTOR`. Ve solo los de su ente.

### 2.3 Actividades previas

`justificacionNecesidadContratacion` y `justificacionVentajas` admiten **hasta 2000 caracteres**. Sube el contador del frontend a ese límite.

### 2.4 Porcentajes

Se validan en el DTO (400 al guardar) y al completar el módulo:

| Campo                             | Rango    |
| --------------------------------- | -------- |
| `porcentajeGarantiaLaboral`       | 0 a 10   |
| `porcentajeResponsabilidadSocial` | 0 a 3    |
| `porcentajeFielCumplimiento`      | 20 a 100 |

### 2.5 Evaluación técnico-económica sin umbral

- Al completar el módulo ya no se valida `puntuacionMinima`. Puede seguir llegando y se ignora.
- En el hub, ninguna oferta se descalifica por puntaje en la evaluación técnico-económica, **tampoco en expedientes que ya tenían el umbral guardado**.
- El pliego ya no imprime la nota "puntuación mínima de … puntos".
- **No cambia:** la puntuación mínima de la **Calificación técnica** y de la **Calificación financiera**.

### 2.6 Documentos de Fase 1

- **Guardar sin cambios** no marca nada como desactualizado.
- **Reabrir** un módulo ya no invalida nada por sí solo.
- **Un cambio real** marca solo los documentos de Fase 1 que usan ese módulo:

| Módulo              | Documentos de Fase 1 que se marcan           |
| ------------------- | -------------------------------------------- |
| Actividades Previas | Actividades Previas, Acta de Inicio y Pliego |
| Llamado             | Llamado a Participar y Pliego                |
| Cualquier otro      | Pliego                                       |

Los documentos de fases posteriores siguen marcándose ante cualquier cambio real.

### 2.7 Normativas

- **Pliego:** imprime **todas** las normativas globales activas, en el orden de la documentación y una por viñeta. Las adicionales del expediente van en su propia lista. Si no hay adicionales, desaparece también el párrafo que las introduce.
- **Adicionales opcionales:** completar Aspectos Generales ya no exige normativas. Ya puedes quitar esa validación del frontend.
- `normativaLegal: []` borra las adicionales.
- `GET /biblioteca/normativa-global`:
  - Ordena por el nuevo campo `orden`.
  - `POST` y `PATCH` aceptan `orden`; si se omite al crear, la normativa va al final.

### 2.8 Página web del ente

- `PATCH /entes/:id` acepta `paginaWeb` (opcional, máximo 255 caracteres) y `GET /entes/:id` la devuelve.
- La usan el pliego y los informes de recomendación y de desierto.
- Si está vacía, el texto omite el tramo del ente en lugar de dejar un hueco:
  - Pliego: "…en el portal web del SNC (www.snc.gob.ve) hasta un día antes…".
  - Informes: "…publicado en la página web del SNC (www.snc.gob.ve)…".

### 2.9 Recaudos en el pliego

- **RIF, RNC y evaluación de desempeño** ya no imprimen "true" o "false". Usan el mismo texto que el Informe de Recomendación, con la variante de declaración jurada cuando se permite.
- **Recaudos no exigidos** desaparecen sin dejar espacio.
- **Recaudos adicionales** salen uno por línea, en los dos sobres.
- **Anexo:** nombra el modelo de cada recaudo adicional ("MODELO: …") en lugar del texto literal.

### 2.10 Moneda e idioma

`{moneda_diferente_au_au}` e `{idioma_diferente_au_au}` imprimen los textos de la documentación para SÍ y para NO, con el nombre de la moneda o del idioma. No cambia nada en el frontend.

### 2.11 Cronograma calculado por UNIVERSITAS

`POST /expedientes/generar-cronograma` (y sus variantes por modalidad) respondía 500 para `UNIVERSITAS`, porque ese usuario no tiene ente. Ahora calcula con fines de semana, sin los días no laborables del ente.

### 2.12 Modelo de Contrato: marcas con el dato del expediente

- `GET …/fase-preparatoria/modelo-contrato` devuelve cada cláusula con sus marcas (`{desc_objeto_contratacion_au_au}`, `[ETIQUETA]`…) convertidas en **píldoras con el valor**, igual que el contrato de Fase 4:

  ```html
  <span class="contract-pill" data-token-id="objeto_contratacion_au_au" data-resolved="true"
    >Adquisición de…</span
  >
  ```

  Lo guardado no cambia: el valor se calcula en cada lectura. Si el objeto del expediente cambia, la cláusula también.

- **Nuevo** `POST …/fase-preparatoria/modelo-contrato/resolver` con `{ "cuerpoHtml": "…" }` → `{ "cuerpoHtml": "…" }`. Úsalo en el modal **«Revisar y agregar cláusula»**: la cláusula llega cruda de la biblioteca. No guarda nada.
- Las variables que aún no existen en Fase 1 (contratista, monto, fianzas en Bs.) quedan como píldora con su etiqueta. En el pliego salen como `________`.
- **Qué hacer:** el editor del modal debe mostrar las píldoras igual que el de Fase 4. Al guardar el modelo, envíalas tal cual: Fase 4 y el pliego las resuelven por `data-token-id`.
- **Biblioteca:** al guardar una cláusula en la biblioteca (del ente o genérica), el backend devuelve cada píldora a su marca. La biblioteca no se lleva los datos del expediente.

### 2.13 Pliego

- `{puntuacion_bono_local_au_au}` y `{puntuacion_bono_sujeto_au_au}` salían `___` porque se guardan como decimal. Ya salen con su valor.
- Las cláusulas del Anexo IV salen como **CLÁUSULA PRIMERA: TÍTULO EN MAYÚSCULA**. Si el frontend guarda `order` como número, se convierte al ordinal; si guarda la palabra ("primera"), se pasa a mayúscula.
- Cada ítem del presupuesto lleva `{numero_item_au_au}` (1, 2, 3…).
- **Anexo III:** cada modelo empieza en su propia página y el salto va dentro de su bloque. Si un modelo no se exige, desaparece sin dejar páginas ni renglones en blanco.

### 2.14 Seguridad

`POST /auth/change-user-password` escribía en el log la contraseña del administrador y la nueva contraseña del usuario. Ya no. **Después del deploy**, quienes cambiaron contraseñas durante las pruebas deberían cambiarlas de nuevo.

---

## 3. Del documento de QA, para el frontend

| Punto de QA                                                                         | Qué encontramos                                                                                                                     |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Cambiar la contraseña de un usuario desde el admin                                  | En local, la API responde 201 con `*` y con `#`. El error "Server Components" sale del frontend                                     |
| Fecha pasada en el acta de inicio                                                   | "Unexpected non-whitespace character after JSON". La API no tiene endpoint de tasa BCV; parece la lectura de la tasa en el frontend |
| Llamado: 1.500,00 se ve como 15,00                                                  | La API devuelve el decimal como texto (`"1500"`). Revisar cómo lo interpreta la máscara del campo                                   |
| `{forma_presentacion_au_au}`                                                        | El texto está fijo en el mapper del pliego y cambia según el tipo de contratación (bienes, servicios u obras)                       |
| Modelo de contrato con marcas `{…}`                                                 | El pliego copia las cláusulas tal como se guardaron. Si el editor las resuelve antes de guardar, salen con su valor                 |
| «Ver modelo»                                                                        | Cargar los documentos de ejemplo con los códigos `mod-*` desde Configuración → Documentos de ejemplo                                |
| Error "Server Components" en general                                                | Sale cuando la API responde 400, 401 o 409 y la pantalla no muestra el `message`. Mostrarlo en vez de romper la página              |
| RIF sobre "Tipo de persona", selección poco visible y migaja de "Editar expediente" | Son de maquetación del frontend                                                                                                     |

## 3.1 Para documentación

- **Numeración de ítems:** la marca es `{numero_item_au_au}`, en la primera columna del presupuesto. Ya está en la plantilla del repositorio.
- **Prototipo «REFACTORIZACIÓN … Pliego»:** no se usó como plantilla. Le faltan los ajustes de esta rama (normativas, página web, recaudos, moneda e idioma) y tiene bloques que abren con un nombre y cierran con otro (`{#criterios_calificacion_tecnica_despues_au_au}` … `{/criterios_calificacion_tecnica_hasta_au_au}`), lo que impide generar el Word. Sus cambios de texto ya se pasaron a la plantilla del repositorio; para próximos cambios conviene partir de esa.

---

## 4. Verificación

| Qué                                   | Resultado                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `tsc --noEmit`, ESLint y `nest build` | Sin errores                                                                                                |
| Pruebas unitarias                     | **233**, todas pasan (44 nuevas)                                                                           |
| Ciclo completo de Fase 4              | 89 comprobaciones correctas                                                                                |
| API en local                          | Usuario con `#` y `.`, actores con EJECUTOR, cronograma con UNIVERSITAS, `paginaWeb` y orden de normativas |
| Pliego generado en local              | Dos escenarios opuestos revisados: normativas, recaudos, moneda, idioma, página web y anexo                |
| Anexo III                             | Sin modelos y con algunos: 0 páginas vacías (antes 20 y 14)                                                |
| Modelo de Contrato en local           | El GET devuelve la cláusula con el objeto del expediente y lo guardado no cambia                           |
| Ciclos completos                      | Fase 4: 89 comprobaciones; compliance: 69                                                                  |
