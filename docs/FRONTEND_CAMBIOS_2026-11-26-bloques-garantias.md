# Bloques de garantías en el Modelo de Contrato (QA 26/11, Misael)

Implementamos el plan que revisaste, con tu ajuste: la píldora lleva solo un título corto. **No hay que tocar el editor.** No hay migraciones ni rutas nuevas.

## Qué cambia

Las 4 marcas de la cláusula de Garantías ya no salen en crudo en la Fase 1. Se ven como píldoras:

| Marca (`data-token-id`)                     | Si aplica en la tarjeta 8           | Si no aplica                                 |
| ------------------------------------------- | ----------------------------------- | -------------------------------------------- |
| `retencion_fiel_cumplimiento_au_au`         | `[RETENCIÓN DE FIEL CUMPLIMIENTO]`  | `No aplica: Retención de fiel cumplimiento`  |
| `modelo_anticipo_contrato_au_au`            | `[GARANTÍA DE ANTICIPO]`            | `No aplica: Garantía de anticipo`            |
| `modelo_garantia_laboral_au_au`             | `[GARANTÍA LABORAL]`                | `No aplica: Garantía laboral`                |
| `modelo_poliza_responsabilidad_civil_au_au` | `[PÓLIZA DE RESPONSABILIDAD CIVIL]` | `No aplica: Póliza de responsabilidad civil` |

- Llegan así en `GET /fase1/:expedienteId/modelo-contrato` y en `POST /fase1/:expedienteId/modelo-contrato/resolver`.
- El título se recalcula en cada lectura. Si cambian la tarjeta 8, se actualiza al volver a abrir el modelo.
- El API las reconoce solo por `data-token-id`. No importa el orden de los atributos ni el texto de adentro.

## Menú de variables

Las 4 están ahora en `GET /biblioteca/tokens`, con `disponibleDesde: 'EXPEDIENTE'` y un campo nuevo, **`bloque: true`**. Si alguien borra la píldora, la reinserta desde el menú.

Si quieres, puedes usar `bloque` para agruparlas aparte en el menú (por ejemplo, «Bloques de garantías»). Es opcional.

## Dónde se convierten en párrafo

- **Word del Pliego (Fase 1):** antes salía con las llaves. Ahora sale el párrafo, o nada si no aplica.
- **Fase 4, pantalla del contrato (`GET .../contratos/:evaluacionId`):** la píldora llega ya convertida en párrafo editable, como hoy. Vale también para las cláusulas agregadas desde el repositorio con el `resolver` de la Fase 1: si la píldora viene con el título, al guardar y volver a abrir el contrato ya es el párrafo.
- **Word del contrato (Fase 4):** igual, por `data-token-id`.
- **Biblioteca:** al guardar, cada píldora vuelve a ser `{marca}`. No se lleva el título ni el párrafo del expediente.

## Cómo probar

- [ ] Modelo de Contrato con la póliza en «Sí» en la tarjeta 8: la cláusula de Garantías muestra `[PÓLIZA DE RESPONSABILIDAD CIVIL]`.
- [ ] Cambiar la tarjeta 8 a «No» y volver a abrir: dice «No aplica: Póliza de responsabilidad civil».
- [ ] Borrar la píldora y reinsertarla desde el menú de variables.
- [ ] «Guardar esta versión en la Biblioteca»: la cláusula guardada tiene `{modelo_poliza_responsabilidad_civil_au_au}`.
- [ ] Generar el Pliego: el párrafo de la póliza sale completo, sin llaves.
- [ ] En la Fase 4, el contrato muestra el párrafo, y el Word también.
