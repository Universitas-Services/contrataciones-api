# Fase 4 — Ajustes aplicados

**Para:** frontend (Frank)
**De:** backend (`contrataciones-api`)
**Fecha:** 4 de noviembre de 2026
**Rama:** `fase4`
**Responde a:** `API_FASE4_AJUSTES.md` del 4 de noviembre

---

## 1. Resultado

**Los cinco bloqueantes eran correctos.** Se aplicaron **B1, B2, B3 y B5** y **los ocho ajustes menores**. **B4** (las plantillas `.docx`) sigue pendiente a la espera del PDF 3.

Verificado con 47 pruebas unitarias y **72 comprobaciones** del ciclo completo contra la base, todas correctas.

| #                                | Estado                              |
| -------------------------------- | ----------------------------------- |
| B1 — corchetes sin resolver      | ✅ corregido                        |
| B2 — catálogo incompleto         | ✅ corregido                        |
| B3 — contrato del subsiguiente   | ✅ corregido                        |
| B4 — documentos Word             | ⏳ bloqueado por los textos legales |
| B5 — desierto parcial sella todo | ✅ corregido                        |
| M1 – M8                          | ✅ los ocho                         |

---

## 2. B1 — Los corchetes ahora se resuelven

Tenías razón: el parser solo reconocía `<span data-token-id>`, y las cláusulas de la biblioteca traen el corchete escrito a mano. Las pruebas no lo detectaban porque usaban spans.

**Qué se hizo:** antes de resolver nada, `corchetesAPildoras()` convierte en píldora cada corchete que el catálogo reconozca. Se aplica en los tres modos — `RESOLVER`, `VALOR` y `LINEA` — y también en `extraerTokenIds`.

Dos detalles que valen la pena:

- **Es idempotente.** Las píldoras ya existentes se apartan antes de buscar corchetes, así que aplicarlo dos veces no anida spans.
- **No toca lo que no es variable.** Un `[sic]` o un `[1]` se quedan como están, porque el catálogo no los reconoce.

Se agregaron **8 pruebas sobre el texto real** de `clausulas-genericas.data.ts`, incluida una que verifica que una cláusula completa sale sin un solo corchete crudo.

## 3. B2 — El catálogo pasó de 21 a 38 tokens

Confirmado: 21 corchetes distintos en las cláusulas, 2 coincidían.

**Los dos que diferían en redacción** se resuelven ahora por **alias**: `[PARTIDAS PRESUPUESTARIAS]` y `[PLAZO EJECUCION DIAS]` apuntan al mismo token que sus etiquetas del catálogo. El índice `TOKENS_POR_CLAVE` indexa etiqueta y alias, así que un texto viejo no se queda sin resolver por una palabra de diferencia.

**Los 17 que faltaban** se agregaron. De ellos, **tres sí tenían fuente** y se resuelven solos:

| Token                                            | Fuente                                      |
| ------------------------------------------------ | ------------------------------------------- |
| `monto_garantia_fiel_cumplimiento_numeros_au_au` | monto × 1,16 × `porcentajeFielCumplimiento` |
| `monto_garantia_fiel_cumplimiento_letras_au_au`  | lo mismo, en letras                         |
| `ciudad_domicilio_especial_au_au`                | `EntePublico.ciudad`                        |

Los otros 14 quedan como **píldora sin resolver**, con un origen nuevo `CONTRATO` que significa «lo escribe quien arma el contrato». Es el manejo que proponías en tu punto 4. Si prefieres un formulario previo, dímelo y lo monto.

## 4. B3 — El contrato del subsiguiente ya sale completo

Se separó lo que es del ente de lo que es de la oferta, siguiendo lo acordado en la pregunta 2:

- **Partidas** (son del ente): dictamen propio → dictamen del infractor → partidas del expediente.
- **Plazo** (es de la oferta): dictamen propio → `plazoEjecucionSubsiguiente` del certificado → plazo del procedimiento de Fase 1.

La prueba comprueba que el subsiguiente hereda `4.02.01.01.00` del infractor y usa los 75 días que se pidieron en el certificado.

## 5. B5 — El desierto parcial ya no sella el expediente

Tenías razón y el PDF 3 también. Ahora `cierreDesierto` mira el carácter:

- **PARCIAL con otros adjudicados vigentes:** cierra el ciclo, deja al infractor `DECAIDO`, emite las notificaciones y **no sella**. Los demás contratos siguen disponibles.
- **En cualquier otro caso** —TOTAL, o PARCIAL sin adjudicados que queden— sella como antes.

La prueba cubre los dos caminos: ahora el escenario PARCIAL siembra **dos adjudicados**, que es el caso real, y se agregó un escenario aparte para el desierto que sí cierra el procedimiento.

## 6. B4 — Pendiente, y por qué

Sigue sin generarse ningún `.docx`. Lo que falta no es código: son **los textos legales de los bloques condicionales**. Pásame el PDF «2. DOCUMENTACIÓN ELABORACIÓN CONCURSO ABIERTO (3).pdf» y lo cierro: plantillas, generación en cada paso, preview y download por `evaluacionId` y por ciclo, y regeneración de los registros que quedaron con URL vacía.

---

## 7. Los ocho menores

| #   | Qué se hizo                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `plazoEjecucionSubsiguiente` es obligatorio cuando la decisión es `SUBSIGUIENTE`                                                              |
| M2  | `docDe` ya filtra `estaDesactualizado`: no se ofrece descargar algo vencido                                                                   |
| M3  | `calcular-vencimientos` sin fecha responde **400** con mensaje, ya no 500                                                                     |
| M4  | `GET /biblioteca/tokens` devuelve `id` y `alias`                                                                                              |
| M5  | Se resuelven `lugar_ejecucion`, `porcentaje_anticipo`, `porcentaje_responsabilidad_social` y los dos del CRS                                  |
| M6  | Editar un contrato generado **conserva `GENERADO`** y su `generadoAt`; lo que se marca desactualizado es el `.docx`                           |
| M7  | `participantesCierre` trae `documentoId`                                                                                                      |
| M8  | El desellado **reabre el ciclo** que cerró el expediente e invalida sus notificaciones; `UNIVERSITAS` y `SUPERVISOR` ya pueden leer el estado |

Sobre **M5 y el CRS**: tenías razón en que `tb_adjudicacion` no sirve aquí. El monto del CRS se calcula como `montoContrato × porcentajeResponsabilidadSocial / 100`, tomando el porcentaje de la Fase 1. Si el criterio legal es otro, avísame.

Sobre **M6**: lo resolví como sugeriste — el frontend puede seguir usando `generadoAt`.

---

## 8. Verificación

| Qué                           | Resultado                                         |
| ----------------------------- | ------------------------------------------------- |
| `tsc --noEmit`                | Sin errores                                       |
| `eslint`                      | Sin errores                                       |
| Arranque                      | Las 15 rutas registradas                          |
| Pruebas unitarias             | **47**, todas pasan (22 → 30 en Fase 4)           |
| Ciclo completo contra la base | **72 comprobaciones**, todas correctas (antes 58) |

```bash
npx ts-node -T scripts/pruebas/prueba-fase4.ts
```

Escenarios que cubre ahora: TOTAL con siguiente opción, **PARCIAL con desierto que no sella**, **desierto que sí cierra el procedimiento**, los bloqueos de contrato, las invalidaciones en cascada, el desellado con reapertura del ciclo y todos los rechazos.

---

## 9. Lo que necesito de tu lado

1. **El PDF 3**, para cerrar B4.
2. **Confirmar el criterio del CRS** (M5).
3. Si prefieres un **formulario previo** para los 14 datos que no tienen fuente, en vez de que se escriban en el generador (B2).

Cuando quieras, revisa la rama de nuevo.
