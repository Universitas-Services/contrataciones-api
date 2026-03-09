# Instrucciones para la Plantilla del Pliego de Condiciones

## Archivo requerido

Coloque el archivo `pliego-base.docx` en esta carpeta (`src/adquiriente-pliego/templates/`).

## Marcadores/Placeholders disponibles

La plantilla DOCX debe usar llaves simples `{marcador}` para los datos que serán reemplazados automáticamente.

### Datos del Ente

| Marcador                        | Descripción                                   |
| ------------------------------- | --------------------------------------------- |
| `{nom_ente_contratante}`        | Nombre del ente contratante                   |
| `{siglas_ente}`                 | Siglas del ente                               |
| `{direccion_fiscal_ente}`       | Dirección fiscal del ente                     |
| `{rif_ente}`                    | RIF del ente                                  |
| `{estado_ente}`                 | Estado del ente                               |
| `{municipio_ente}`              | Municipio del ente                            |
| `{ciudad_ente}`                 | Ciudad del ente                               |
| `{nom_unidad_contratante}`      | Nombre de la unidad contratante               |
| `{nom_unidad_admin_financiera}` | Nombre de la unidad administrativa financiera |
| `{organo_adscripcion}`          | Órgano de adscripción                         |

### Datos del Expediente

| Marcador                | Descripción                            |
| ----------------------- | -------------------------------------- |
| `{codigo_nomenclatura}` | Código de nomenclatura del proceso     |
| `{descripcion_objeto}`  | Descripción del objeto de contratación |
| `{estatus_proceso}`     | Estatus del proceso                    |
| `{total_presupuesto}`   | Total del presupuesto                  |

### Modalidad de Contratación

| Marcador                 | Descripción               |
| ------------------------ | ------------------------- |
| `{tipo_contratacion}`    | Tipo de contratación      |
| `{modalidad_seleccion}`  | Modalidad de selección    |
| `{monto_estimado_bs}`    | Monto estimado en Bs      |
| `{monto_estimado_dolar}` | Monto estimado en dólares |

### Máxima Autoridad

| Marcador             | Descripción                     |
| -------------------- | ------------------------------- |
| `{nombre_autoridad}` | Nombre completo de la autoridad |
| `{cedula_autoridad}` | Cédula de la autoridad          |
| `{cargo_autoridad}`  | Cargo oficial de la autoridad   |

### Comisión y Unidad Usuaria

| Marcador                       | Descripción                      |
| ------------------------------ | -------------------------------- |
| `{denominacion_comision}`      | Denominación de la comisión      |
| `{nombre_unidad_usuaria}`      | Nombre de la unidad usuaria      |
| `{responsable_unidad_usuaria}` | Responsable de la unidad usuaria |

### Fase Preparatoria

| Marcador                    | Descripción                    |
| --------------------------- | ------------------------------ |
| `{detalles_tecnicos}`       | Detalles técnicos y de calidad |
| `{direccion_retiro_pliego}` | Dirección de retiro del pliego |
| `{horario_retiro_pliego}`   | Horario de retiro del pliego   |
| `{costo_pliego_bs}`         | Costo del pliego en Bs         |
| `{dias_validez_oferta}`     | Días de validez de la oferta   |

### Cronograma

| Marcador                  | Descripción                            |
| ------------------------- | -------------------------------------- |
| `{fecha_llamado}`         | Fecha del llamado a participar         |
| `{fecha_inicio_pliego}`   | Fecha inicio disponibilidad del pliego |
| `{fecha_fin_pliego}`      | Fecha fin disponibilidad del pliego    |
| `{fecha_apertura_sobres}` | Fecha del acto de apertura de sobres   |

### Metadatos

| Marcador             | Descripción                       |
| -------------------- | --------------------------------- |
| `{fecha_generacion}` | Fecha de generación del documento |
| `{anio}`             | Año actual                        |

### Logo (Imagen)

Para incluir el logo del ente, use el marcador de imagen:

```
{%logo_ente}
```

## Notas importantes

- Los marcadores que no se encuentren en la plantilla serán ignorados.
- Si un dato no está disponible, se mostrará "N/A".
- El archivo debe ser formato `.docx` (Word), NO `.doc`.
- Use exactamente los nombres de marcadores indicados arriba (respetando mayúsculas/minúsculas).
