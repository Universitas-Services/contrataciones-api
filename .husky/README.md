# Husky Pre-commit Hooks

## 🎯 Configuración Completada

Este proyecto utiliza **Husky** para ejecutar automáticamente validaciones antes de cada commit.

## 🪝 Hooks Configurados

### 1. Pre-commit Hook

**Ejecuta automáticamente:**
- ✅ **Prettier** → Formatea el código
- ✅ **ESLint** → Corrige errores de lint
- ✅ **Jest** → Ejecuta tests relacionados con los archivos modificados

**Archivos afectados:**
- `*.ts` → TypeScript files
- `*.json` → JSON files
- `*.md` → Markdown files

### 2. Commit-msg Hook

**Valida formato del commit:**
- ✅ Debe seguir **Conventional Commits**
- ✅ Formato: `type(scope): description`

## 📝 Formato de Commits Válidos

### Estructura

```
type(scope): description

[optional body]

[optional footer]
```

### Types Permitidos

| Type | Descripción | Ejemplo |
|------|-------------|---------|
| `feat` | Nueva funcionalidad | `feat(auth): agregar login con JWT` |
| `fix` | Corrección de bug | `fix(entes): corregir filtrado por rol` |
| `docs` | Cambios en documentación | `docs(readme): actualizar guía de instalación` |
| `style` | Formato de código | `style: aplicar prettier` |
| `refactor` | Refactorización | `refactor(services): simplificar lógica` |
| `test` | Agregar o modificar tests | `test(auth): agregar tests unitarios` |
| `chore` | Tareas de mantenimiento | `chore: actualizar dependencias` |
| `perf` | Mejoras de performance | `perf(queries): optimizar consultas prisma` |
| `ci` | Cambios en CI/CD | `ci: agregar workflow de tests` |
| `build` | Cambios en build | `build: actualizar tsconfig` |
| `revert` | Revertir commits | `revert: deshacer cambio en auth` |

### Ejemplos Válidos ✅

```bash
feat: agregar endpoint de supervisores
fix(auth): corregir validación de token
docs: actualizar README con instrucciones de testing
test(entes): agregar tests E2E
chore(deps): actualizar NestJS a v11
```

### Ejemplos Inválidos ❌

```bash
Agregar login                    # Falta type
feat agregar login               # Falta ":"
feat: Agregar login.             # Subject termina en punto
FIX: corregir error             # Type en mayúsculas (aceptado pero no recomendado)
```

## 🚀 Flujo de Trabajo

### 1. Hacer cambios en el código

```bash
# Editar archivos
code src/auth/auth.service.ts
```

### 2. Staged files

```bash
git add .
```

### 3. Commit

```bash
git commit -m "feat(auth): agregar autenticación con roles"
```

### 4. Hooks se ejecutan automáticamente

```
🔍 Running pre-commit checks...
  ✔ Prettier formatting
  ✔ ESLint checking
  ✔ Running tests

📝 Validating commit message...
  ✔ Commit message is valid
```

### 5. Si todo está OK, el commit se completa

```bash
[main abc1234] feat(auth): agregar autenticación con roles
 3 files changed, 45 insertions(+), 2 deletions(-)
```

## ⚠️ Si los Hooks Fallan

### Pre-commit falla

```bash
❌ ESLint errors found
❌ Tests failed
```

**Solución:**
1. Revisa los errores mostrados
2. Corrige el código
3. Vuelve a hacer `git add`
4. Intenta el commit nuevamente

### Commit-msg falla

```bash
❌ Commit message does not follow conventional format
```

**Solución:**
1. Usa el formato correcto: `type(scope): description`
2. Intenta el commit nuevamente con el mensaje correcto

## 🔧 Configuración

### lint-staged (`package.json`)

```json
{
  "lint-staged": {
    "*.ts": [
      "prettier --write",
      "eslint --fix",
      "jest --bail --findRelatedTests --passWithNoTests"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### commitlint (`commitlint.config.js`)

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'test', 'chore', 'perf', 'ci', 'build', 'revert'
    ]],
  },
};
```

## 🎯 Bypass Hooks (Solo en Emergencias)

Si necesitas hacer un commit sin ejecutar los hooks:

```bash
git commit --no-verify -m "fix: emergency hotfix"
```

> ⚠️ **ADVERTENCIA**: Solo usa `--no-verify` en casos de emergencia. Los hooks están para garantizar calidad del código.

## 📊 Comandos Útiles

```bash
# Ejecutar lint-staged manualmente
npx lint-staged

# Validar mensaje de commit manualmente
echo "feat: test message" | npx commitlint

# Ejecutar validación completa
npm run validate
```

## ✅ Beneficios

1. ✅ **Código consistente** → Prettier automático
2. ✅ **Sin errores de lint** → ESLint ejecutado antes de commit
3. ✅ **Tests pasando** → Solo tests relacionados con archivos modificados
4. ✅ **Commits legibles** → Conventional Commits obligatorio
5. ✅ **Historial limpio** → Mensajes de commit estandarizados

---

## 🆘 Troubleshooting

### "command not found: husky"

```bash
npm install
```

### Hooks no se ejecutan

```bash
npx husky install
git config core.hooksPath .husky
```

### Permisos en Windows

Los hooks deberían funcionar automáticamente en Git Bash o PowerShell.

---

**📅 Última actualización:** 2026-02-04
