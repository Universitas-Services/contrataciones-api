# Fase 4 — Formalización (Gestión): respuesta del backend

**Para:** frontend (Frank)
**De:** backend (`contrataciones-api`)
**Fecha:** 29 de octubre de 2026
**Responde a:** `API_FASE4_GESTION.md` del 23 de octubre
**Verificado contra:** `main` en `277736d`

---

## 1. Alcance

Este documento responde al brief de Fase 4 de gestión: confirma qué de lo que
asume ya existe, detalla lo que hay que construir, responde las cinco preguntas
abiertas y deja el plan de entregas.

No cubre la Fase 4 de elaboración, que no cambia.

---

## 2. Qué ya existe (y el brief daba por supuesto)

Al momento del brief, nada de la gestión de adjudicación de Fase 3 estaba en
`main`. Entró después, en los commits de `documentos/fase3`. Hoy existe todo:

| Pieza                                                                                                 | Estado     |
| ----------------------------------------------------------------------------------------------------- | ---------- |
| `DictamenAdjudicacion` (`tb_dictamen_adjudicacion`)                                                   | ✅ existe  |
| `ExpedienteContratacion.caracterAdjudicacion`                                                         | ✅ existe  |
| `GET /evaluacion-fase3/expediente/{id}/gestion-adjudicacion`                                          | ✅ existe  |
| `PUT …/gestion-adjudicacion/caracter`, `GET …/dictamenes`, upserts TOTAL/PARCIAL/no-adjudicado        | ✅ existen |
| `FasePreparatoria.modeloContratoData`                                                                 | ✅ existe  |
| `DocumentoGenerado.evaluacionId` y `estaDesactualizado`                                               | ✅ existen |
| `FasePreparatoria.porcentajeFielCumplimiento`, `requiereGarantiaLaboral`, `porcentajeGarantiaLaboral` | ✅ existen |
| `CronogramaExpediente.fechaLimiteAdjudicacion`                                                        | ✅ existe  |
| Días no laborables del ente (`DiaNoLaborableEnte`)                                                    | ✅ existe  |
| `EstatusProceso.DESIERTO`                                                                             | ✅ existe  |

El dictamen trae exactamente lo que la Fase 4 necesita: `tipoDictamen`,
`montoAdjudicadoTotal` / `montoAdjudicadoParcial`, `partidasAdjudicadasTotal` /
`…Parcial`, `plazoEjecucionOfertaGanadora` / `…Parcial`,
`alcanceAdjudicacionParcial`, `oferenteAdjudicadoProcedimiento`,
`causaNoAdjudicado` y `montoManoObraOfertado` (base de la fianza laboral).

**Conclusión:** la Fase 4 se puede construir encima de lo que hay. No hace falta
tocar `Adjudicacion` ni `ContratoFormalizado`.

---

## 3. Modelo de datos

Se acepta la propuesta del brief, con dos ajustes.

### 3.1 `ContratoFase4` (`tb_contrato_definitivo_fase4_au_au`)

Un contrato por oferente adjudicado. **Se adopta `clauses` como JSON**, no las 22
columnas de la documentación: el formato es idéntico al de
`modeloContratoData.clauses` de Fase 1, así la precarga es un clon directo sin
traductor en el medio.

| Campo                                              | Tipo                      |
| -------------------------------------------------- | ------------------------- |
| `id`                                               | uuid                      |
| `expedienteId`                                     | FK                        |
| `evaluacionId`                                     | FK unique                 |
| `clauses`                                          | Json                      |
| `estado`                                           | `BORRADOR \| GENERADO`    |
| `montoContratoBs`                                  | Decimal(15,2)             |
| `generadoAt`                                       | DateTime?                 |
| `documentoId`                                      | FK? → `DocumentoGenerado` |
| timestamps + `createdBy`, `updatedBy`, `deletedAt` |                           |

### 3.2 `DecaimientoFase4` (`tb_decaimiento_adjudicacion_fase4_au_au`)

Un registro por ciclo, tal como lo describe el brief en §3.2, con **dos campos
agregados** que salen de las preguntas 1 y 2 (ver §5):

- `montoReadjudicadoBs` — Decimal(15,2)?, para el caso TOTAL.
- `plazoEjecucionSubsiguiente` — Int?, el plazo que asume el subsiguiente.

### 3.3 Cambios en tablas existentes

- `TipoDocumento`: se agregan `CERTIFICADO_INCUMPLIMIENTO`,
  `RESOLUCION_DECAIMIENTO`, `NOTIFICACION_DECAIMIENTO`,
  `NOTIFICACION_ADJUDICACION_SUBSIGUIENTE`, `NOTIFICACION_FIN_PROCEDIMIENTO`.
  `CONTRATO` ya existe.
- `DocumentoGenerado`: se agrega `decaimientoId String?`.
- `ExpedienteContratacion`: se agrega `selladoFase4At DateTime?`. El cierre por
  decaimiento usa `estatusProceso = DESIERTO` pero **no** reutiliza
  `declaratoriaDesierto` / `causalDeclaratoriaDesierto`, que son de Fase 2
  (Art. 113) y disparan los Informes Desierto #1–#3. Confirmado: son flujos
  distintos.
- Las readjudicaciones se derivan de los ciclos `CERRADO` con
  `decision = SUBSIGUIENTE`. No se materializa una tabla aparte.

---

## 4. Endpoints

Se adopta el prefijo propuesto: `/formalizacion-fase4/expediente/{expedienteId}`,
con JWT y los mismos roles que la gestión de Fase 3 (`ADMIN_ENTE`, `EJECUTOR`;
lectura también para `VISUALIZADOR`).

Se acepta tal cual el contrato de respuesta de §4.1 (estado completo en una sola
llamada), el de contratos por oferente de §4.2, las acciones del ciclo de §4.3 y
el formato de `cicloActivo` / `ciclosCerrados` de §4.4.

**Un endpoint adicional**, que no estaba en el brief:

| Acción                       | Método | Ruta                                                   |
| ---------------------------- | ------ | ------------------------------------------------------ |
| Vista previa de vencimientos | `GET`  | `…/calcular-vencimientos?fechaNotificacion=YYYY-MM-DD` |

Motivo en §7.

---

## 5. Respuestas a las cinco preguntas abiertas

**1. Monto del contrato en readjudicación TOTAL.**
No se usa `montoOfertaBs` del subsiguiente sin más: la oferta es lo que él
ofertó, no lo que el ente le adjudica, y pueden diferir. Se pide un
`montoReadjudicadoBs` **obligatorio en el certificado**, precargado con
`montoOfertaBs` del subsiguiente para que el usuario lo confirme o lo corrija.
Así queda un acto administrativo con monto expreso, que es lo que el contrato
necesita para sostenerse.

**2. Partidas y plazo del subsiguiente.**
Se separan:

- Las **partidas se heredan del expediente**. Son del ente, no del oferente: la
  disponibilidad presupuestaria no cambia porque cambie el contratista.
- El **plazo se pide en el certificado** (`plazoEjecucionSubsiguiente`), porque
  sí es propio de cada oferta.

**3. `fec_limite_adjudicacion_au_au`.**
Confirmado: sale de `CronogramaExpediente.fechaLimiteAdjudicacion`. El campo
existe y se usa como la fecha del acto.

**4. Contrato del infractor ya generado.**
Se marca **desactualizado, no se borra**. `DocumentoGenerado.estaDesactualizado`
ya existe y se usa igual en otros flujos. Borrarlo destruiría evidencia de un
procedimiento administrativo; lo que corresponde es que deje de poder
descargarse como vigente.

**5. Legado.**
`Adjudicacion` y `ContratoFormalizado` **se quedan** y siguen sirviendo a
elaboración. La Fase 4 de gestión vive aparte y no los toca. Retirarlos es una
limpieza posterior, cuando elaboración migre.

---

## 6. Variables del contrato: el catálogo necesita ids

Aquí hay trabajo que el brief no anticipó.

**Las 14 variables del diccionario de §6.2 tienen fuente en la base.** La nota
del brief dice que el frontend no tiene el nombre, RIF y órgano de adscripción
del ente, ni la cédula del representante ni el registro mercantil: es cierto que
el _frontend_ no los recibe hoy, pero el _backend_ sí los tiene todos. La
precarga los va a devolver resueltos.

El problema es otro: **el catálogo de tokens que ya existe
(`src/biblioteca/constants/tokens-contrato.constants.ts`) identifica cada token
por su etiqueta en texto, no por un id.** El frontend pide buscar por
`data-token-id`, que es lo correcto. Hay que agregarle un `id` estable a cada
token, y al hacerlo salen ocho etiquetas que no coinciden:

| `data-token-id` que pide el front | Etiqueta en el catálogo actual          |                          |
| --------------------------------- | --------------------------------------- | ------------------------ |
| `nombre_ente_contratante_au_au`   | NOMBRE DEL ENTE CONTRATANTE             | coincide                 |
| `nombre_contratista_au_au`        | NOMBRE DEL CONTRATISTA                  | coincide                 |
| `rif_contratista_au_au`           | RIF DEL CONTRATISTA                     | coincide                 |
| `monto_contrato_numeros_au_au`    | MONTO CONTRATO EN NUMEROS               | coincide                 |
| `monto_contrato_letras_au_au`     | MONTO CONTRATO EN LETRAS                | coincide                 |
| `rif_ente_au_au`                  | RIF DEL ENTE **CONTRATANTE**            | difiere                  |
| `representante_contratista_au_au` | REPRESENTANTE LEGAL **DEL** CONTRATISTA | difiere                  |
| `cedula_representante_au_au`      | CEDULA **DEL** REPRESENTANTE **LEGAL**  | difiere                  |
| `registro_mercantil_au_au`        | REGISTRO MERCANTIL **DEL** CONTRATISTA  | difiere                  |
| `partidas_presupuestarias_au_au`  | PARTIDA PRESUPUESTARIA (singular)       | difiere                  |
| `objeto_contratacion_au_au`       | OBJETO **DEL CONTRATO**                 | difiere                  |
| `nomenclatura_proceso_au_au`      | **CODIGO DEL PROCEDIMIENTO**            | difiere                  |
| `plazo_ejecucion_dias_au_au`      | PLAZO DE EJECUCION **EN** DIAS          | difiere                  |
| `organo_adscripcion_au_au`        | —                                       | **falta en el catálogo** |

Qué se hace con esto:

1. Se agrega un `id` a cada token del catálogo, usando los que propone el
   frontend como fuente de verdad.
2. El `id` pasa a ser lo único que manda. La etiqueta queda como texto visible y
   puede cambiar sin romper nada.
3. Se agrega `organo_adscripcion_au_au`, cuya fuente (`EntePublico.organoAdscripcion`)
   ya existe.
4. **El catálogo tiene tokens que el frontend no lista** — lugar de ejecución,
   porcentajes de fiel cumplimiento, anticipo y responsabilidad social, monto y
   letras del CRS, fecha de adjudicación. No se quitan: se les pone id igual, y
   el frontend los suma al menú "Insertar variable" cuando quiera.

Sobre el render: se confirma lo del brief. En la **precarga** se sustituye el
texto interno por el valor real conservando `data-token-id` y agregando
`data-resolved="true"`. Al **generar el `.docx`** cada píldora se vuelve texto
plano, y sin valor se pone una línea `________`. En el **pliego de Fase 1** van
siempre como línea.

---

## 7. Dos observaciones sobre las reglas

**El sellado no tiene vuelta atrás (§5.5).**
Tal como está redactado, después del cierre en lote todo endpoint de escritura
responde 409, incluido cualquier intento de deshacer. Si el usuario declara
desierto por error, el expediente queda trancado para siempre. Se propone dejar
un desellado restringido a `UNIVERSITAS` / `SUPERVISOR`, porque en la práctica
esto va a pasar.

**Los días hábiles se calculan en dos lugares (§5.6).**
El brief dice que el frontend hace el mismo cálculo como vista previa mientras se
llena el formulario. Dos implementaciones del mismo cálculo terminan divergiendo,
y el síntoma es el peor posible: el usuario ve una fecha en pantalla y otra
distinta en el documento. Por eso se agrega
`GET …/calcular-vencimientos?fechaNotificacion=…`, para que la vista previa use
el cálculo del servidor. El backend sigue siendo la fuente de verdad y recalcula
al guardar, sin confiar en lo que mande el frontend.

---

## 8. Plantillas `.docx`

Son seis, con los `TipoDocumento` y los bloques condicionales que indica §7 del
brief. Las estructuras y los `{#bloques}` los arma el backend.

**Lo que falta y no lo puede resolver el backend:** los textos legales exactos de
cada bloque condicional, que según el brief están en el PDF 3 de la
documentación. Sin esos textos las plantillas quedan con la estructura lista pero
el contenido vacío. Hay que pedirlos.

Cálculos que sí hace el backend:

- `monto_fiel_cumplimiento_subsiguiente_bs_au_au = monto adjudicado × 1,16 × (porcentajeFielCumplimiento / 100)`.
- Garantía laboral sobre `DictamenAdjudicacion.montoManoObraOfertado`, con
  `requiereGarantiaLaboral` y `porcentajeGarantiaLaboral` de la Fase 1.
- La modalidad degradada la elige el usuario; proponerla según el UCAU remanente
  queda como opcional, fuera de este alcance.

---

## 9. Plan de entregas

| #   | Entrega       | Contenido                                                                                                              |
| --- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Migración     | `ContratoFase4`, `DecaimientoFase4`, `DocumentoGenerado.decaimientoId`, `selladoFase4At`, 5 valores de `TipoDocumento` |
| 2   | Tokens con id | `id` en el catálogo, `organo_adscripcion_au_au`, parser por `data-token-id` para contrato (valor) y pliego (línea)     |
| 3   | Contratos     | `GET` de estado, precarga desde `modeloContratoData` con tokens resueltos, borrador, generar, preview, download        |
| 4   | Decaimiento   | Ciclo de 4 pasos, días hábiles con feriados del ente, invalidaciones en cascada, cierre en lote y sellado              |

Las seis plantillas `.docx` van en paralelo, bloqueadas por los textos del PDF 3.

---

## 10. Checklist

- [ ] Migración de Fase 4 (entrega 1)
- [ ] `id` en el catálogo de tokens + `organo_adscripcion_au_au` (entrega 2)
- [ ] Parser de píldoras por `data-token-id` (entrega 2)
- [ ] `GET /formalizacion-fase4/expediente/{id}` — estado completo
- [ ] Contratos: precarga, borrador, generar, preview, download por `evaluacionId`
- [ ] Decaimiento: iniciar, deshacer, decisión, certificado, resolución, notificar al infractor, notificar al subsiguiente, cerrar, cierre en lote
- [ ] `GET …/calcular-vencimientos`
- [ ] Desellado restringido a `UNIVERSITAS` / `SUPERVISOR`
- [ ] Reglas de §5 del brief (orden, bloqueos, invalidaciones, 409 tras sellado)
- [ ] 6 plantillas `.docx` — **bloqueadas:** faltan los textos del PDF 3
- [ ] Guía para el frontend con los endpoints finales
