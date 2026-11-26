# Respuesta a `API_PENDIENTES_2026-11-26.md` — para Carlos

Puntos 29 a 38. Sin migraciones y sin cambios de rutas.

## Resumen

| #      | Estado                                   | ¿Cambia algo en el frontend?                                                         |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| 29     | Hecho                                    | Quitar la marca de fallo esperado de la prueba E2E                                   |
| 30     | Hecho                                    | No. Si el chat pinta la elección por su cuenta, quitarlo para que no salga dos veces |
| 31     | Hecho                                    | No. En local ya no hace falta `--env-file`                                           |
| 32     | Hecho: el archivo sale del repositorio   | No                                                                                   |
| 33     | Sin cambios: espera a QA o documentación | —                                                                                    |
| 34     | Hecho                                    | No                                                                                   |
| 37     | Hecho en lo que depende del código       | No                                                                                   |
| 38     | Hecho                                    | Tratar el nuevo 409                                                                  |
| 35, 36 | Opinión al final                         | —                                                                                    |

## 29. Feriado borrado

Registrar de nuevo una fecha borrada responde **201** y reactiva el mismo registro, con la descripción nueva. Revisa los cronogramas igual que un feriado nuevo. Funciona también en `/bulk`, con los recurrentes y al editar un feriado hacia una fecha que tenía uno borrado.

Una fecha que ya tiene un feriado vigente sigue respondiendo **409**.

## 30. Botones de modalidad y tipo

`PATCH /compliance/expedientes/:id` registra un mensaje `USUARIO` por cada dato que cambia, antes del «Ahora sube…»:

- `Modalidad: Concurso Abierto - Acto Único Apertura Única`
- `Tipo de contratación: Bienes`
- `Número del expediente: …` y `Nombre: …`, si cambian por esa vía

No llama al agente.

## 31. `JWT_SECRET`

Se lee del `.env` después de cargarlo, y ya no hay clave de respaldo. Si falta `JWT_SECRET`, **el API no arranca**. En local basta `node dist/main` con el `.env` en la carpeta.

## 34. Semilla

`npm run seed` lee el `.env`. Sigue negándose si la base no es local, y **sigue borrando toda la base local**.

## 37. 504 al subir en compliance

- El catálogo del agente se lee al arrancar el API.
- Pasada una hora se sigue usando el guardado y se actualiza en segundo plano. Ninguna subida espera al agente, salvo que el API no haya podido leerlo nunca.

**No está resuelto todo.** Render, en el plan gratis, se duerme tras unos 15 minutos sin uso y tarda cerca de un minuto en despertar. Si es la causa, solo lo arregla un plan pago. El manejo del 504 que ya hiciste sigue siendo necesario.

## 38. Duplicados

Si en el mismo expediente y tipo ya hay un documento vigente con **el mismo nombre y tamaño**, la subida responde **409**:

> El archivo oferta-2.pdf ya está cargado en Ofertas.

Tras un 504, si el reintento recibe este 409, el documento ya estaba guardado: recarga y no lo trates como error. Reemplazar un documento por otro sigue igual.

## 33. «Nulidad absoluta»

Sin cambios. El texto del mensaje se alinea cuando QA o documentación lo pidan.

## 35 y 36. Opinión

- **UNIVERSITAS** administra desde el panel aparte. En este frontend conviene avisar y cerrar la sesión, como en `fix/guardian-sesion`.
- **Guardián de rutas:** en el backend no hay nada que indique que se desactivó a propósito. Conviene preguntarle a Frank. El acceso del SUPERVISOR coincide con `FRONTEND_COMPLIANCE.md`. Activarlo nos parece correcto.

## Cómo probar

- [ ] Registrar, borrar y volver a registrar un feriado: 201. Lo mismo con un recurrente.
- [ ] Elegir modalidad y tipo con los botones: la elección aparece en el chat antes de «Ahora sube…», también al recargar.
- [ ] Subir dos veces la misma oferta: la segunda vez, 409.
- [ ] Arrancar el API en local sin `--env-file`: el inicio de sesión y las rutas protegidas funcionan.
