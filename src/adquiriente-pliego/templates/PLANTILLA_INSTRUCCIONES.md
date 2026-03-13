# Instrucciones para la Plantilla DOCX - Pliego de Condiciones

## Marcador de Criterios de Evaluación

En la plantilla DOCX, donde actualmente está `{criterio_evaluacion_au_au}`, **reemplázalo** con las siguientes secciones condicionales:

```
{#es_bienes}
  [Aquí colocar las tablas de CRITERIOS TÉCNICOS A EVALUAR BIENES/SUMINISTROS
   + MATRIZ DE EVALUACIÓN TÉCNICA BIENES/SERVICIOS tal como aparecen en el ejemplo]
{/es_bienes}

{#es_servicios}
  [Aquí colocar las tablas de CRITERIOS TÉCNICOS A EVALUAR PRESTACIÓN DE SERVICIOS
   + MATRIZ DE EVALUACIÓN TÉCNICA PRESTACIÓN DE SERVICIOS]
{/es_servicios}

{#es_obras}
  [Aquí colocar las tablas de CRITERIOS TÉCNICOS A EVALUAR para OBRAS
   + MATRIZ DE EVALUACIÓN TÉCNICA para OBRAS]
{/es_obras}
```

### ¿Cómo funciona?

- Si el expediente tiene `tipo_contratacion = BIENES` o `MIXTO`, se mostrará solo la sección entre `{#es_bienes}...{/es_bienes}`
- Si es `SERVICIOS`, se mostrará solo `{#es_servicios}...{/es_servicios}`
- Si es `OBRAS`, se mostrará solo `{#es_obras}...{/es_obras}`
- Las secciones que no aplican se **eliminan automáticamente** del documento generado

### Pasos para editar la plantilla:

1. Abrir `pliego-base.docx` en Word
2. Buscar `{criterio_evaluacion_au_au}` y eliminarlo
3. En su lugar, escribir `{#es_bienes}` (inicio de la sección de Bienes)
4. Pegar las tablas de criterios de evaluación para **Bienes** con el formato deseado
5. Escribir `{/es_bienes}` (fin de la sección de Bienes)
6. Repetir para `{#es_servicios}...{/es_servicios}` y `{#es_obras}...{/es_obras}`
7. Guardar el archivo

---

## Todos los Marcadores Disponibles

| Marcador                        | Descripción                         |
| ------------------------------- | ----------------------------------- |
| `{nom_ente_contratante}`        | Nombre del ente                     |
| `{siglas_ente}`                 | Siglas del ente                     |
| `{direccion_fiscal_ente}`       | Dirección fiscal                    |
| `{rif_ente}`                    | RIF del ente                        |
| `{estado_ente}`                 | Estado                              |
| `{municipio_ente}`              | Municipio                           |
| `{ciudad_ente}`                 | Ciudad                              |
| `{nom_unidad_contratante}`      | Nombre unidad contratante           |
| `{nom_unidad_admin_financiera}` | Nombre unidad admin financiera      |
| `{organo_adscripcion}`          | Órgano de adscripción               |
| `{cod_nomenclatura_proceso}`    | Código nomenclatura                 |
| `{desc_objeto_contratacion}`    | Descripción del objeto              |
| `{tipo_contratacion}`           | Tipo (BIENES/SERVICIOS/OBRAS/MIXTO) |
| `{tipo_objeto_contratacion}`    | Alias del tipo contratación         |
| `{modalidad_seleccion}`         | Modalidad de selección              |
| `{monto_estimado_bs}`           | Monto estimado Bs                   |
| `{monto_estimado_dolar}`        | Monto estimado USD                  |
| `{nombre_autoridad}`            | Nombre de la autoridad              |
| `{cedula_autoridad}`            | Cédula de la autoridad              |
| `{cargo_autoridad}`             | Cargo de la autoridad               |
| `{denominacion_comision}`       | Denominación comisión               |
| `{nombre_unidad_usuaria}`       | Nombre unidad usuaria               |
| `{responsable_unidad_usuaria}`  | Responsable unidad usuaria          |
| `{detalles_tecnicos}`           | Detalles técnicos/calidad           |
| `{direccion_retiro_pliego}`     | Dirección retiro pliego             |
| `{horario_retiro_pliego}`       | Horario retiro                      |
| `{costo_pliego_bs}`             | Costo pliego en Bs                  |
| `{dias_validez_oferta}`         | Días validez oferta                 |
| `{fecha_llamado}`               | Fecha llamado                       |
| `{fecha_inicio_pliego}`         | Fecha inicio disponibilidad         |
| `{fecha_fin_pliego}`            | Fecha fin disponibilidad            |
| `{fecha_apertura_sobres}`       | Fecha apertura sobres               |
| `{fecha_generacion}`            | Fecha de generación                 |
| `{anio}`                        | Año actual                          |

### Secciones Condicionales (Criterios de Evaluación)

| Marcador                            | Condición                           |
| ----------------------------------- | ----------------------------------- |
| `{#es_bienes}...{/es_bienes}`       | Se muestra si tipo = BIENES o MIXTO |
| `{#es_servicios}...{/es_servicios}` | Se muestra si tipo = SERVICIOS      |
| `{#es_obras}...{/es_obras}`         | Se muestra si tipo = OBRAS          |

### Loop de Adquirientes

```
{#adquirientes}
  {numero} | {fec_adquisicion_pliego_au_au} | {nombre_proveedor_adquiriente_au_au} | ...
{/adquirientes}
```
