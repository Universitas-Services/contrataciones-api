# Guía: Configurar Render para CI/CD

## 🎯 Objetivo

Conectar tu aplicación NestJS con Render para deployment automático cuando haces push a `dev` (staging) o `main` (production).

---

## 📋 Prerrequisitos

✅ Código en GitHub
✅ Dockerfile creado
✅ Workflows de GitHub Actions configurados

---

## 🚀 Paso 1: Crear Servicios en Render

### 1.1 Crear Servicio de Staging

1. Ve a [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Conecta tu repositorio de GitHub
4. Configure:

```yaml
Name: contrataciones-api-staging
Environment: Docker
Branch: dev
Docker Context: ./
Dockerfile Path: ./Dockerfile
```

5. **Instance Type:** Free (o Starter)

6. **Environment Variables:**
```
DATABASE_URL = postgresql://user:pass@dpg-xxx.oregon-postgres.render.com/dbname
JWT_SECRET = tu-secret-super-seguro-staging
NODE_ENV = production
PORT = 3000
```

7. Click **Create Web Service**

### 1.2 Crear Servicio de Production

Repite los pasos anteriores pero con:

```yaml
Name: contrataciones-api-production
Branch: main
```

Environment variables diferentes (usar DB de producción).

---

## 🔗 Paso 2: Obtener Deploy Hooks

### Para Staging:

1. Ve al servicio `contrataciones-api-staging`
2. **Settings** → **Deploy Hook**
3. Click **Create Deploy Hook**
4. Copia la URL:
   ```
   https://api.render.com/deploy/srv-xxxxx?key=yyyyy
   ```

### Para Production:

Repite para `contrataciones-api-production`.

---

## 🔐 Paso 3: Configurar Secrets en GitHub

1. Ve a tu repo en GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Agregar:

**Secret 1:**
```
Name: RENDER_DEPLOY_HOOK_STAGING
Value: https://api.render.com/deploy/srv-xxxxx?key=yyyyy
```

**Secret 2:**
```
Name: RENDER_DEPLOY_HOOK_PRODUCTION
Value: https://api.render.com/deploy/srv-zzzzz?key=wwwww
```

---

## 🗄️ Paso 4: Configurar PostgreSQL en Render

### 4.1 Crear Base de Datos

1. **New +** → **PostgreSQL**
2. Configure:
```
Name: contrataciones-db-staging
Database: contrataciones_staging
User: admin_staging
Region: Oregon (same as web service)
```

3. **Plan:** Free

4. Click **Create Database**

### 4.2 Obtener Connection String

1. Ve a la base de datos creada
2. **Info** → **Internal Database URL**
3. Copia el URL:
   ```
   postgresql://user:pass@dpgXXX.oregon-postgres.render.com/dbname
   ```

### 4.3 Agregar a Environment Variables

1. Ve al Web Service (`contrataciones-api-staging`)
2. **Environment** → **Add Environment Variable**
3. Agregar:
   ```
   Key: DATABASE_URL
   Value: postgresql://user:pass@dpgXXX.oregon-postgres.render.com/dbname
   ```

4. Click **Save Changes**

**Repetir para Production con su propia base de datos.**

---

## 🐳 Paso 5: Configurar Build Settings

En cada Web Service:

### Build Command

```bash
npm install && npx prisma generate && npm run build
```

### Start Command

```bash
npx prisma migrate deploy && npm run start:prod
```

### Health Check Path

```
/
```

---

## ⚙️ Paso 6: Variables de Entorno Completas

### Staging:

```bash
DATABASE_URL=postgresql://user:pass@dpg-xxx.oregon-postgres.render.com/staging_db
JWT_SECRET=staging-secret-key-change-this
NODE_ENV=production
PORT=3000
```

### Production:

```bash
DATABASE_URL=postgresql://user:pass@dpg-yyy.oregon-postgres.render.com/prod_db
JWT_SECRET=production-secret-key-super-secure
NODE_ENV=production
PORT=3000
```

---

## ✅ Paso 7: Primer Deploy Manual

1. Ve al servicio en Render
2. **Manual Deploy** → **Deploy latest commit**
3. Espera ~5-10 minutos
4. Verifica logs:
   - ✅ Build exitoso
   - ✅ Migraciones aplicadas
   - ✅ Servidor corriendo

---

## 🔄 Paso 8: Test Auto-Deploy

### Test Staging:

```bash
git checkout dev
echo "// test" >> src/main.ts
git add .
git commit -m "test: probar auto-deploy staging"
git push origin dev
```

**Resultado esperado:**
1. ✅ GitHub Actions CI corre
2. ✅ GitHub Actions CD trigger deploy hook
3. ✅ Render detecta hook y redeploy
4. ✅ App actualizada en staging

### Test Production:

```bash
git checkout main
git merge dev
git push origin main
```

**Resultado esperado:**
1. ✅ CI corre
2. ✅ CD espera que CI pase
3. ✅ Trigger production deploy
4. ✅ App actualizada en production

---

## 📊 Monitoreo

### En Render:

**Logs en tiempo real:**
```
Dashboard → Service → Logs
```

**Métricas:**
```
Dashboard → Service → Metrics
```

**Deploy History:**
```
Dashboard → Service → Events
```

### En GitHub:

**Actions status:**
```
Repo → Actions
```

---

## 🛡️ Configuración de Seguridad

### 1. Environment Protection Rules (Opcional)

En GitHub:

1. **Settings** → **Environments**
2. Click en `production`
3. **Configure protection rules:**
   - ✅ Required reviewers (1 approver)
   - ✅ Wait timer (5 minutos)

Ahora deploys a production requieren aprobación manual.

### 2. Branch Protection Rules

1. **Settings** → **Branches**
2. **Add rule** para `main`:
   - ✅ Require pull request reviews (1)
   - ✅ Require status checks to pass (CI)
   - ✅ Require branches to be up to date

---

## 🎯 URLs Finales

Después de configurar todo:

**Staging:**
```
https://contrataciones-api-staging.onrender.com
https://contrataciones-api-staging.onrender.com/api/docs
```

**Production:**
```
https://contrataciones-api-production.onrender.com
https://contrataciones-api-production.onrender.com/api/docs
```

---

## 🆘 Troubleshooting

### Build falla en Render

```bash
# Ver logs completos en Render Dashboard
# Verificar Dockerfile
# Verificar package.json scripts
```

### Migraciones fallan

```bash
# Verificar DATABASE_URL
# Verificar schema.prisma
# Correr migraciones localmente primero
npx prisma migrate dev
```

### Health check falla

```bash
# Verificar que app escucha en PORT
# Verificar que / endpoint existe
# Verificar logs de startup
```

### Deploy hook no funciona

```bash
# Verificar secret en GitHub está correcto
# Copiar deploy hook de nuevo desde Render
# Verificar logs de GitHub Actions
```

---

## ✅ Checklist Final

- [ ] Servicios creados en Render (staging + production)
- [ ] Bases de datos creadas (staging + production)
- [ ] Environment variables configuradas
- [ ] Deploy hooks copiados
- [ ] Secrets configurados en GitHub
- [ ] Primer deploy manual exitoso
- [ ] Auto-deploy testeado en staging
- [ ] Auto-deploy testeado en production
- [ ] URLs funcionando
- [ ] Swagger UI accesible

---

**🎉 ¡Listo! Tu CI/CD está completamente configurado.**
