# Scripts SQL

Scripts que se ejecutan **a mano** contra una base de datos, normalmente la de
producción (Render). Sirven para verificar estado, diagnosticar o aplicar un
cambio puntual cuando el flujo normal no aplica.

## Antes de usar esto: el flujo normal NO es manual

El contenedor aplica las migraciones solo al arrancar. En `Dockerfile`:

```
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

Es decir: **al hacer push a `main`, Render reconstruye y aplica automáticamente
las migraciones pendientes de `prisma/migrations/`.** No hay que correr SQL a
mano en un despliegue normal.

Estos scripts son para los casos en que eso no basta:

- Verificar qué migraciones registra Prisma antes de desplegar.
- Reparar el registro cuando alguien aplicó SQL a mano y Prisma no se enteró.
- Diagnosticar una migración que falló y dejó el contenedor sin arrancar.

## Convención de nombres

```
NN_verbo_descripcion.sql
```

`NN` es un número de orden de dos dígitos. El nombre debe decir qué hace, no a
qué módulo pertenece: `03_reparar_registro_migraciones.sql`, no `03_fase1.sql`.

Todo script debe:

1. Empezar con un comentario que explique **qué hace, por qué existe y cuándo
   usarlo**.
2. Ser **idempotente** siempre que se pueda (`IF NOT EXISTS`, `ON CONFLICT`),
   para que volver a correrlo no rompa nada.
3. Indicar explícitamente si **modifica datos**, y no mezclar lectura con
   escritura en el mismo archivo.

## Cómo ejecutarlos en Render

Dashboard → la base de datos → **Connect** → copiar el _PSQL Command_, y pegar
el contenido del script. O bien, desde una máquina con acceso:

```bash
psql "$DATABASE_URL" -f scripts/sql/00_verificar_estado_migraciones.sql
```

## Reglas de seguridad

- **Nunca** ejecutar aquí el seeder: borra toda la base. `prisma/seed.ts` tiene
  una protección que lo impide fuera de un host local.
- Antes de cualquier script que escriba, tomar respaldo desde Render
  (_Backups_ → _Create backup_).
- Leer el script completo antes de pegarlo. Si no está claro qué hace, no
  ejecutarlo.
