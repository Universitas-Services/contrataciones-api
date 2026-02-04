# Instrucciones: Plantilla DOCX

## 📍 Ubicación de la Plantilla

La plantilla DOCX debe colocarse en:

```
src/manuales/templates/manual-ente-base.docx
```

**Ruta completa:**
```
C:\Users\unive\Desktop\proye baken\nest\contrataiones\sistema-contrataciones-backend-v2\src\manuales\templates\manual-ente-base.docx
```

---

## 📝 Cómo Crear la Plantilla

### Paso 1: Crear el DOCX en Word

Abre Microsoft Word y crea un documento con este contenido de ejemplo:

```
═══════════════════════════════════════════════════════════
              MANUAL DE PROCEDIMIENTOS
═══════════════════════════════════════════════════════════

Ente Contratante: {nom_ente_contratante}
Siglas: {siglas_ente}

Fecha de Generación: {fecha_generacion}
Año: {anio}

───────────────────────────────────────────────────────────
1. ORGANIZACIÓN DEL ENTE
───────────────────────────────────────────────────────────

El presente manual regula los procedimientos de contratación 
del {nom_ente_contratante}, identificado por las siglas {siglas_ente}.

Unidades Clave Responsables:

• Unidad Administrativa y Financiera: 
  {nom_unidad_admin_financiera}
  Encargada de gestionar el presupuesto y los pagos.

• Unidad Contratante: 
  {nom_unidad_contratante}
  Responsable de ejecutar los procesos de compra.

• Unidad de Tecnología: 
  {nom_unidad_tecnologia}
  Encargada de publicar los llamados en la web.

───────────────────────────────────────────────────────────
2. PROCEDIMIENTOS
───────────────────────────────────────────────────────────

[Aquí puedes agregar más secciones de tu manual...]

═══════════════════════════════════════════════════════════
Documento generado por: {nom_ente_contratante} ({siglas_ente})
Fecha: {fecha_generacion}
═══════════════════════════════════════════════════════════
```

### Paso 2: Usar los Marcadores Correctos

**IMPORTANTE:** Los marcadores deben estar entre llaves `{}`:

✅ **CORRECTO:**
- `{nom_ente_contratante}`
- `{siglas_ente}`
- `{nom_unidad_admin_financiera}`
- `{nom_unidad_contratante}`
- `{nom_unidad_tecnologia}`
- `{fecha_generacion}`
- `{anio}`

❌ **INCORRECTO:**
- `{{nom_ente_contratante}}` (doble llave)
- `$nom_ente_contratante$`
- `[nom_ente_contratante]`

### Paso 3: Guardar el Archivo

1. En Word, haz clic en **Archivo → Guardar como**
2. Nombre del archivo: `manual-ente-base.docx`
3. Formato: **Documento de Word (.docx)**
4. Guárdalo temporalmente en tu escritorio

### Paso 4: Copiar a la Ubicación Correcta

Después de crear la estructura de carpetas (que haré ahora), copia el archivo a:
```
src/manuales/templates/manual-ente-base.docx
```

---

## 🎨 Formato y Estilos

Puedes usar cualquier formato de Word:
- ✅ Negritas, cursivas, subrayado
- ✅ Colores de texto
- ✅ Tablas
- ✅ Listas numeradas o con viñetas
- ✅ Encabezados y pies de página
- ✅ Imágenes y logos
- ✅ Saltos de página

**Solo asegúrate de mantener los marcadores `{nombre_marcador}` donde quieres que se inserten los datos.**

---

## 📁 Estructura de Carpetas (La creo ahora)

Voy a crear la estructura de carpetas necesaria.
