# Régimen Jurídico en dos preguntas (QA 26/11, Misael)

Aspectos Generales del Pliego, paso 1. Decisión de Edward: el pop-up de las normativas generales deja de ser solo informativo. **Hay una migración nueva** (`20261126_normativas_generales_seleccion`); Render la aplica al desplegar.

## Pregunta 1: normativas generales (selección)

- La lista sale de `GET /biblioteca/normativa-global`, como hoy, en el orden de la documentación.
- **Vienen sin marcar.** El usuario marca las que aplican al procedimiento.
- Se envían en el campo nuevo **`normativasGeneralesIds`** (lista de `id`), tanto en `PUT /fase1/:expedienteId/aspectos-generales` como en `.../completar`.
- El orden en que se envíen no importa: el Pliego las imprime en el orden de la documentación.
- `GET .../aspectos-generales` devuelve `datos.normativasGeneralesIds` para volver a marcar las casillas. Los expedientes anteriores traen `null`.
- **Para completar hace falta al menos una.** Si no hay ninguna, `completar` responde 400 con: «Debe seleccionar al menos una normativa general del Régimen Jurídico.» Guardar el borrador no la exige.
- Los expedientes anteriores, que no tienen selección (`null`), siguen llevando todas al Pliego hasta que alguien guarde una selección.

## Pregunta 2: normativas adicionales (se guardan en el ente)

- Se siguen enviando en `normativaLegal` (lista de textos), como hoy, y van al Pliego en su propio marcador después de las generales.
- **Nuevo:** al guardar o completar el módulo, el API registra cada adicional en la biblioteca del ente, sin importar el rol y sin repetir las que el ente ya tiene. Al comparar no cuentan mayúsculas, acentos, espacios ni el punto final.
- Para ofrecerlas en el próximo procedimiento, usa `GET /entes/:enteId/normativa`, que ya permite ver la lista a EJECUTOR y VISUALIZADOR. El usuario elige una de esa lista o escribe una nueva.

## Cómo probar

- [ ] Abrir el pop-up de las generales: vienen sin marcar y en orden.
- [ ] Marcar 2, guardar y volver a abrir: siguen marcadas.
- [ ] Intentar completar sin ninguna marcada: sale el mensaje de arriba.
- [ ] Generar el Pliego: salen solo las 2 marcadas, en el orden de la documentación, y después las adicionales.
- [ ] Agregar una adicional y guardar: aparece en `GET /entes/:enteId/normativa`.
- [ ] En otro expediente del mismo ente: la adicional aparece para elegirla.

## Porcentajes en el borrador (tu punto 4)

Hecho como lo pediste. El borrador (`PUT`) ya no aplica los rangos legales a estos 3 campos. Solo exige que el valor sea un porcentaje válido, de 0 a 100:

| Campo                             | Módulo              | Rango legal, solo en `completar` |
| --------------------------------- | ------------------- | -------------------------------- |
| `porcentajeFielCumplimiento`      | Aspectos Generales  | 20 a 100                         |
| `porcentajeResponsabilidadSocial` | Aspectos Generales  | 0 a 3                            |
| `porcentajeGarantiaLaboral`       | Actividades Previas | 0 a 10                           |

- Un 0,21 a medio escribir ya no bloquea el borrador ni la navegación.
- Al completar, el error llega en `errores`, por ejemplo: «El porcentaje de fiel cumplimiento debe estar entre 20 y 100.»
- Los decimales del campo («21» que queda «0,21») se corrigen de tu lado.
