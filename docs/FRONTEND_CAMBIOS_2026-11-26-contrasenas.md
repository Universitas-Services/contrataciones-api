# Respuesta a `API_PENDIENTES_2026-11-26-contrasenas.md` para Carlos

Respuesta a los puntos 39 a 43. No hay migraciones ni rutas nuevas.

## Resumen

| #    | Estado                        | ¿Cambia algo en el frontend?                                 |
| ---- | ----------------------------- | ------------------------------------------------------------ |
| 39.1 | Regla confirmada              | Puedes hacer las pantallas                                   |
| 39.2 | Hecho, con pruebas            | No                                                           |
| 39.3 | Opción (a), sin script        | No                                                           |
| 39.4 | Hecho, con visualizador nuevo | Volver a sembrar la base de pruebas                          |
| 40   | Hecho                         | Mostrar el 503 del contrato y ofrecer reintentar             |
| 41   | Hecho                         | Mostrar «Adjudicado» y «Contratado» con el estatus que llega |
| 42   | Cierre normal = `CONTRATADO`  | No hay acción de cierre                                      |
| 43   | Hecho                         | No                                                           |

## 39. Contraseña temporal

### 39.1. Regla

**Confirmada para todos los roles:** el usuario debe cambiar la contraseña si `cambioPasswordDefault === false || passwordPerdido === true`.

Al revisarla encontramos dos casos en que no se cumplía. Ya están corregidos:

| Momento                                                                                                      | `cambioPasswordDefault` | `passwordPerdido`                        |
| ------------------------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------- |
| El admin pone la contraseña al **editar** el usuario (`PATCH /entes/:id/usuarios/:usuarioId` con `password`) | `true`                  | **`true`** (antes no se marcaba)         |
| Restablecer por correo (`/auth/reset-password`)                                                              | `true`                  | **`false`** (antes se quedaba en `true`) |

Los demás caminos siguen igual:

- Crear el usuario: `false` / `false`.
- `change-user-password`: `true` / `true`.
- `change-password`: `true` / `false`.

Si el admin edita **su propio** usuario y pone una contraseña, también se le pedirá cambiarla. Es raro, y lo dejamos así.

### 39.2. Cambio propio

`POST /auth/change-password` sirve a cualquier rol con sesión. Lo fijan las pruebas de `src/auth/contrasena-temporal.spec.ts`:

- Con ejecutor y con visualizador responde `{ message: 'Contraseña actualizada correctamente' }`. Las marcas quedan `cambioPasswordDefault: true` y `passwordPerdido: false`.
- Con la contraseña temporal equivocada responde **401** «La contraseña actual es incorrecta» y no cambia nada.

### 39.3. Usuarios que ya existen

Queda la opción (a): no hay script de datos.

### 39.4. Semilla

- Ejecutor de Miranda: `cambioPasswordDefault: true`.
- **Visualizador nuevo:** `visualizador@miranda.gob.ve`, con la misma contraseña que las demás cuentas de Miranda en `prisma/seed.ts` y `cambioPasswordDefault: true`.
- Los admins siguen en `false`.

Para tenerlo en tu base de pruebas hay que volver a sembrarla. Recuerda que **`npm run seed` borra toda la base local**.

## 40. Contrato sin Word

`POST /formalizacion-fase4/expediente/:expedienteId/contratos/:evaluacionId/generar` responde **503** cuando el documento no se pudo crear:

> El contrato se guardó, pero no se pudo generar el documento. Intente generarlo de nuevo.

- El contrato **sí queda guardado** como `GENERADO`. Para reintentar sirve llamar otra vez a la misma ruta, o a `POST /formalizacion-fase4/expediente/:expedienteId/documentos/regenerar-pendientes`.
- Muestra el mensaje del API. No lo trates como el 503 de Render dormido.

## 41. Estatus del expediente

El estatus (`estatusProceso`) lo calcula el API en la Fase 3 y la Fase 4. No hay que enviar nada:

| Situación                                                             | Estatus                                       |
| --------------------------------------------------------------------- | --------------------------------------------- |
| Se guarda un dictamen con al menos un adjudicado                      | `ADJUDICADO`                                  |
| Todos los adjudicados vigentes tienen su contrato generado y con Word | `CONTRATADO`                                  |
| Contrato generado sin Word (punto 40)                                 | sigue `ADJUDICADO`                            |
| PARCIAL con un adjudicado todavía sin contrato                        | `ADJUDICADO`                                  |
| Se declara un decaimiento                                             | `ADJUDICADO`                                  |
| Se deshace el decaimiento                                             | vuelve a `CONTRATADO` si lo estaba            |
| El subsiguiente asume, aún sin contrato                               | `ADJUDICADO`, y `CONTRATADO` cuando lo genere |
| Ya no queda ningún adjudicado en el dictamen                          | `EN_EVALUACION`                               |
| Desierto, anulado o sellado                                           | no se toca                                    |
| Desellar                                                              | `ADJUDICADO`, y luego según lo anterior       |

**Otros detalles:**

- Volver a evaluar un oferente ya no devuelve a `EN_EVALUACION` un expediente adjudicado, contratado, desierto o anulado. Antes lo hacía.
- Los expedientes actuales cambian de estatus **en su próxima acción** de la Fase 3 o la Fase 4. No hay script de datos.
- En el panel del ente, «en proceso» ya excluía `CONTRATADO`: los contratados dejan de contarse ahí.
- El aviso de feriados sigue revisando los cronogramas de los expedientes `ADJUDICADO`, porque aún les vencen las garantías y la firma.

**Para revisar en el frontend:** que ningún filtro, botón o bloqueo dependa de que el expediente siga en `EN_EVALUACION` durante la Fase 3 o la Fase 4.

## 42. Cierre

No hay una acción de cierre. El final normal es `CONTRATADO`. El final por decaimiento es `DESIERTO`, con el expediente sellado.

## 43. Semilla con decaimiento

La semilla borra el decaimiento antes que `evaluacionResultados`. Lo probamos en una base temporal: sembrar, crear un decaimiento y volver a sembrar funciona.

## Cómo probar

- [ ] Crear un ejecutor: su login trae `cambioPasswordDefault: false`.
- [ ] Cambiarla con su token: el siguiente login trae `true` y `false`.
- [ ] El admin le pone contraseña desde «Editar usuario»: el siguiente login trae `passwordPerdido: true`.
- [ ] Restablecerla por correo: el siguiente login trae `passwordPerdido: false`.
- [ ] Guardar el dictamen: el encabezado dice «Adjudicado».
- [ ] Generar el contrato: dice «Contratado».
- [ ] Declarar un decaimiento: vuelve a «Adjudicado».
- [ ] Sin Cloudinary en local, generar el contrato da el 503 con el mensaje de arriba.
