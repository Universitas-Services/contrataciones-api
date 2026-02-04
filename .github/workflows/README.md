# GitHub Actions CI/CD Workflows

## 📁 Workflows Configurados

Este proyecto incluye dos workflows de GitHub Actions:

### 1. CI Pipeline (`ci.yml`)

**Se ejecuta en:**
- ✅ Push a `main`
- ✅ Push a `dev`
- ✅ Pull Requests a `main` o `dev`

**Jobs:**

#### 🔍 Lint & Format Check
- Verifica formateo de código con Prettier
- Ejecuta ESLint

#### 🧪 Tests
- Crea base de datos PostgreSQL temporal
- Ejecuta migraciones de Prisma
- Corre tests unitarios
- Genera reporte de cobertura

#### 🏗️ Build
- Compila la aplicación
- Sube artifacts para debugging

**Tiempo estimado:** 3-5 minutos

---

### 2. CD Pipeline (`cd.yml`)

**Se ejecuta en:**
- ✅ Push a `dev` → Deploy a **Staging**
- ✅ Push a `main` → Deploy a **Production**

**Environments:**

| Branch | Environment | URL |
|--------|-------------|-----|
| `dev` | Staging | https://staging-contrataciones-api.onrender.com |
| `main` | Production | https://contrataciones-api.onrender.com |

**Jobs:**

#### 🚀 Deploy to Staging (dev branch)
- Trigger inmediato al push
- Despliega a Render Staging
- Sin protección (deploy rápido)

#### 🚀 Deploy to Production (main branch)
- Espera a que CI pase ✅
- Despliega a Render Production
- Con protección y aprobaciones (opcional)

**Tiempo estimado:** 5-10 minutos

---

## 🔐 Secrets Requeridos

Configura en GitHub: **Settings > Secrets and variables > Actions**

### Required Secrets

```
RENDER_DEPLOY_HOOK_STAGING
  → https://api.render.com/deploy/srv-xxxxx?key=yyyyy

RENDER_DEPLOY_HOOK_PRODUCTION
  → https://api.render.com/deploy/srv-zzzzz?key=wwwww
```

**Cómo obtener el Deploy Hook de Render:**

1. Ve a tu servicio en Render
2. Settings → Deploy Hook
3. Copy URL
4. Pégalo en GitHub Secrets

---

## 🔄 Flujo Completo

### Feature Development

```bash
# 1. Crear feature branch
git checkout -b feat/nueva-funcionalidad

# 2. Hacer cambios
git add .
git commit -m "feat: agregar endpoint"

# 3. Push
git push origin feat/nueva-funcionalidad

# 4. Crear Pull Request → dev
# ✅ CI corre automáticamente
# 🔍 Lint + Tests + Build
```

### Deploy to Staging

```bash
# 1. Merge PR a dev
git checkout dev
git merge feat/nueva-funcionalidad
git push origin dev

# GitHub Actions ejecuta:
# ✅ CI Pipeline (lint, test, build)
# 🚀 CD Pipeline → Staging
# 
# Resultado: https://staging-contrataciones-api.onrender.com
```

### Deploy to Production

```bash
# 1. Merge dev → main
git checkout main
git merge dev
git push origin main

# GitHub Actions ejecuta:
# ✅ CI Pipeline (lint, test, build)
# ⏳ Espera confirmación de CI
# 🚀 CD Pipeline → Production
# 
# Resultado: https://contrataciones-api.onrender.com
```

---

## 📊 Status Badges

Agrega al `README.md`:

```markdown
[![CI Pipeline](https://github.com/tu-usuario/tu-repo/actions/workflows/ci.yml/badge.svg)](https://github.com/tu-usuario/tu-repo/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/tu-usuario/tu-repo/actions/workflows/cd.yml/badge.svg)](https://github.com/tu-usuario/tu-repo/actions/workflows/cd.yml)
```

---

## 🎯 Estrategia de Branches

```
main (production)
  ↑
  merge después de testing en staging
  ↑
dev (staging)
  ↑
  merge feature PRs aquí primero
  ↑
feature/nueva-funcionalidad
```

**Regla de oro:** Nunca hacer push directo a `main`, siempre pasar por `dev` primero.

---

## ✅ Checklist Pre-Deploy

Antes de hacer merge a `main`:

- [ ] CI pasa en `dev` ✅
- [ ] Tests manuales en staging OK
- [ ] Migraciones de DB probadas
- [ ] No hay errores en logs de staging
- [ ] Performance OK

---

## 🆘 Troubleshooting

### CI falla en tests

```bash
# Ver logs en GitHub Actions
# Fix locally
npm run test:unit

# Commit fix
git commit -m "fix: corregir test"
```

### CD no despliega

```bash
# Verificar secrets configurados
# Verificar Deploy Hook URL
# Ver logs en Render Dashboard
```

### Rollback en producción

```bash
# Opción 1: Revertir commit
git revert HEAD
git push origin main

# Opción 2: Deploy commit anterior desde Render UI
```

---

## 📈 Monitoreo

**GitHub Actions:**
- Actions tab → Ver runs y logs

**Render:**
- Dashboard → Ver deploys
- Logs → Ver application logs
- Metrics → CPU, Memory, Requests

---

## 🎉 Beneficios

✅ **Calidad garantizada** - CI valida todo antes de deploy
✅ **Deploy automático** - Push y olvida
✅ **Zero downtime** - Render hace rolling updates
✅ **Staging environment** - Prueba antes de producción
✅ **Rollback fácil** - Redeploy commit anterior
✅ **Historial completo** - Logs de todos los deploys
