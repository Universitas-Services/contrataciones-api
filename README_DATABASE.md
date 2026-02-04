# Sistema Contrataciones Backend v2 - NestJS

## Configuración de Base de Datos

Este proyecto utiliza su propio contenedor PostgreSQL independiente del proyecto Laravel.

### Credenciales de Base de Datos

| Parámetro | Valor |
|-----------|-------|
| **Host** | localhost (127.0.0.1) |
| **Puerto** | 5434 |
| **Base de datos** | contrataciones_db |
| **Usuario** | nestjs_user |
| **Contraseña** | nestjs_password_2024 |

### Comandos Principales

#### Iniciar la base de datos
```bash
docker-compose up -d
```

#### Detener la base de datos
```bash
docker-compose down
```

#### Eliminar datos y reiniciar (⚠️ Cuidado: elimina todos los datos)
```bash
docker-compose down -v
docker-compose up -d
```

#### Aplicar schema de Prisma
```bash
npx prisma db push
```

#### Generar cliente de Prisma
```bash
npx prisma generate
```

#### Ver base de datos en Prisma Studio
```bash
npx prisma studio
```

### Troubleshooting

#### Error P1000: Authentication failed
Si recibes un error de autenticación, asegúrate de que:
1. El contenedor esté corriendo: `docker ps`
2. El archivo `.env` tenga la URL correcta
3. No haya volúmenes viejos: `docker-compose down -v && docker-compose up -d`

#### Verificar logs del contenedor
```bash
docker logs contrataciones_db_nest
```

#### Conectarse directamente a PostgreSQL
```bash
docker exec -it contrataciones_db_nest psql -U nestjs_user -d contrataciones_db
```

### Variables de Entorno

Asegúrate de que tu archivo `.env` contenga:
```bash
DATABASE_URL="postgresql://nestjs_user:nestjs_password_2024@127.0.0.1:5434/contrataciones_db?schema=public"
```
