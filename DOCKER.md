# 🐳 Guía de Dockerización

## 📋 Archivos Docker

- **Dockerfile** → Multi-stage build optimizado para producción
- **docker-compose.yml** → Base de datos PostgreSQL (desarrollo)
- **docker-compose.prod.yml** → Aplicación completa (postgres + app)
- **.dockerignore** → Exclusiones del build context
- **.env.docker.example** → Template de variables de entorno

---

## 🚀 Uso Rápido

### Opción 1: Solo Base de Datos (Desarrollo Local)

```bash
# Iniciar solo PostgreSQL
docker-compose up -d

# App corre localmente con npm run start:dev
npm run start:dev
```

**Usar cuando:**
- Desarrollas localmente
- Quieres hot-reload
- Debugging con breakpoints

### Opción 2: Aplicación Completa (Docker)

```bash
# Build y start todo
docker-compose -f docker-compose.prod.yml up --build

# O en background
docker-compose -f docker-compose.prod.yml up -d --build
```

**Usar cuando:**
- Probando ambiente de producción
- Testing de deployment
- Sin dependencias locales de Node.js

---

## 🏗️ Build de la Imagen

### Build manual:

```bash
# Build la imagen
docker build -t contrataciones-api .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your-secret \
  contrataciones-api
```

### Build para Render:

Render hace automáticamente:
```bash
docker build -t app .
docker run app
```

No necesitas hacer nada manual. 🎉

---

## 📊 Stages del Dockerfile

### Stage 1: Dependencies
```dockerfile
FROM node:18-alpine AS dependencies
- Install npm modules
- Generate Prisma Client
```

### Stage 2: Build
```dockerfile
FROM node:18-alpine AS build
- Copy dependencies
- Build TypeScript
- Install production deps only
```

### Stage 3: Production
```dockerfile
FROM node:18-alpine AS production
- Copy built app
- Non-root user (security)
- Health checks
- Start with migrations
```

**Tamaño final:** ~250-300 MB (optimizado)

---

## 🔐 Seguridad Implementada

✅ **Multi-stage build** → Reduce attack surface
✅ **Non-root user** → App runs as `nestjs:nodejs`
✅ **dumb-init** → Proper signal handling (SIGTERM)
✅ **Health checks** → K8s-ready
✅ **Alpine Linux** → Minimal base image
✅ **No dev dependencies** → Solo production en final stage

---

## 📦 Variables de Entorno

### Desarrollo:

```bash
# Copiar template
cp .env.docker.example .env

# Editar valores
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/contrataciones_db
JWT_SECRET=dev-secret-key
NODE_ENV=development
```

### Producción (Render):

Configurar en Render UI:
```
DATABASE_URL → Desde Render PostgreSQL
JWT_SECRET → Random secure string
NODE_ENV → production
PORT → 3000
```

---

## 🔄 Comandos Útiles

### Docker Compose:

```bash
# Start services
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild
docker-compose up --build

# Remove volumes (reset DB)
docker-compose down -v
```

### Docker directo:

```bash
# Build
docker build -t contrataciones-api .

# Run
docker run -p 3000:3000 --env-file .env contrataciones-api

# Ver logs
docker logs -f contrataciones-api

# Exec into container
docker exec -it contrataciones-api sh

# Stop
docker stop contrataciones-api

# Remove
docker rm contrataciones-api
```

---

## 🩺 Health Checks

El Dockerfile incluye health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/', ...)"
```

**Verificar health:**
```bash
docker ps
# HEAL column shows: healthy/unhealthy
```

---

## 🐛 Troubleshooting

### Build falla:

```bash
# Ver build logs completos
docker build --no-cache --progress=plain -t contrataciones-api .

# Verificar .dockerignore
cat .dockerignore

# Limpiar cache
docker builder prune -a
```

### Container no inicia:

```bash
# Ver logs
docker logs contrataciones-api

# Common issues:
- DATABASE_URL incorrecto
- JWT_SECRET faltante
- Puerto ya en uso (cambiar 3000:3001)
```

### Migraciones fallan:

```bash
# Exec into container
docker exec -it contrataciones-api sh

# Run migrations manually
npx prisma migrate deploy

# Ver schema
npx prisma studio
```

### Database connection error:

```bash
# Verify postgres is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Test connection
docker exec -it contrataciones-db psql -U postgres -d contrataciones_db
```

---

## 📊 Optimizaciones Implementadas

### Layer Caching:

```dockerfile
# Copy package.json first (cached si no cambia)
COPY package*.json ./
RUN npm ci

# Copy source después (cambia más frecuente)
COPY . .
```

### Multi-stage Benefits:

- ✅ Dev dependencies no van a producción
- ✅ Build artifacts separados
- ✅ Imagen final pequeña
- ✅ Build más rápido (caching)

### Production Optimizations:

```dockerfile
npm ci --only=production  # Solo prod deps
npm cache clean --force    # Limpiar cache npm
COPY --chown=nestjs:nodejs # Permisos correctos
```

---

## 🚀 Deploy a Render

### Método 1: GitHub Actions (Recomendado)

Ya configurado en `.github/workflows/cd.yml`:

1. Push a `main` o `dev`
2. GitHub Actions trigger deploy hook
3. Render pull código
4. Render build imagen con Dockerfile
5. Render deploy (zero downtime)

### Método 2: Render Auto-Deploy

1. Conecta repo en Render
2. Settings → Build & Deploy:
   - Environment: `Docker`
   - Dockerfile Path: `./Dockerfile`
3. Auto-deploy: ON
4. Push → Auto-deploy

---

## 🎯 Checklist Pre-Deploy

- [ ] Dockerfile testado localmente
- [ ] docker-compose.prod.yml funciona
- [ ] Variables de entorno configuradas
- [ ] Migraciones de Prisma OK
- [ ] Health check pasa
- [ ] Templates copiados correctamente
- [ ] .dockerignore optimizado
- [ ] CI/CD workflows configurados

---

## ✅ Testing Local

```bash
# 1. Build imagen
docker build -t contrataciones-api:test .

# 2. Run completo
docker-compose -f docker-compose.prod.yml up

# 3. Test endpoints
curl http://localhost:3000
curl http://localhost:3000/api/docs

# 4. Test health
curl http://localhost:3000/health

# 5. Cleanup
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🆘 Support

**Documentación oficial:**
- [Dockerfile best practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Compose docs](https://docs.docker.com/compose/)
- [Render Docker deploy](https://render.com/docs/docker)

**Common commands:**
```bash
docker --help
docker-compose --help
docker build --help
```

---

**🎉 Docker setup completo y listo para deployment!**
