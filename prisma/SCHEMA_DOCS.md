# 📘 Documentación del Schema - Sistema de Contrataciones Públicas

## Resumen General

El schema implementa una arquitectura **multi-tenant jerárquica** para gestión de contrataciones públicas con:

- **30+ modelos** organizados en 3 capas
- **15 enums** para tipos de datos controlados
- **Aislamiento por tenant** (`id_ente`)
- **Relaciones temporales** para supervisores
- **Auditoría completa** con soft deletes
- **Versionado** para control de concurrencia

---

## Arquitectura del Schema

### 📊 Capa 1: Multi-Tenancy y Autenticación (6 modelos)

#### `Universitas`
Super administrador del sistema. Un solo registro que gestiona todo.
- Crea y administra Entes
- No tiene acceso a datos operativos

#### `EntePublico` (TENANT)
Organización independiente (Alcaldía, Ministerio, etc.).
- **Aislamiento total**: Cada Ente solo ve sus propios datos
- Ejemplo: Alcaldía de Caracas, Ministerio de Educación

#### `Usuario`
Usuarios del sistema con roles diferenciados:
- `UNIVERSITAS`: Super admin
- `ADMIN_ENTE`: Administra su Ente
- `EJECUTOR`: Crea y edita documentos
- `VISUALIZADOR`: Solo lectura

#### `Supervisor`
Entidad auditora externa (Contraloría, Auditoría, etc.).

#### `EnteSupervisor` ⭐ (Relación Temporal)
Asignación dinámica de Supervisores a Entes:
```prisma
{
  enteId: "ente-001",
  supervisorId: "supervisor-abc",
  fechaInicio: "2024-01-01",
  fechaFin: "2024-12-31",  // Temporal!
  activo: true
}
```

**Casos de uso:**
- Supervisor A audita Ente X durante 6 meses
- Luego se reasigna al Ente Y
- El acceso al Ente X se revoca automáticamente

#### `AuditLog`
Registro completo de TODAS las acciones:
```json
{
  "tabla": "ExpedienteContratacion",
  "registroId": "exp-123",
  "accion": "UPDATE",
  "cambios": {
    "before": { "montoEstimadoBs": 100000 },
    "after": { "montoEstimadoBs": 150000 }
  },
  "usuarioId": "user-456",
  "ipAddress": "192.168.1.100"
}
```

---

### 🏛️ Capa 2: Dominio de Contrataciones (20+ modelos)

#### Estructura Organizacional del Ente

**`MaximaAutoridad`**
- Funcionario que firma contratos
- Soporta delegación de poderes

**`ComisionContrataciones`** + **`MiembroComision`**
- Comité evaluador de ofertas
- Miembros: Jurídico, Técnico, Financiero

**`UnidadUsuaria`**
- Departamento solicitante (ej. Dirección de Informática)

**`UnidadContratante`**
- Departamento de compras

#### Gestión de Proveedores

**`Proveedor`**
Empresas que participan en licitaciones:
- Validación de documentos
- Clasificación por área de especialidad
- Nivel de contratación según patrimonio

**`DocumentoProveedor`**
- RIF, Registro Mercantil
- Estados financieros
- Certificados

#### Proceso de Contratación (Flujo Principal)

```
ExpedienteContratacion
    └─ FasePreparatoria (detalles técnicos)
    └─ CronogramaExpediente (fechas clave)
    └─ PartidaPresupuestaria[] (items a contratar)
    └─ AdquirentePliego[] (quién retiró el pliego)
    └─ OfertaPresentada[]
          └─ EvaluacionResultados (puntajes)
    └─ Adjudicacion (ganador)
          └─ ContratoFormalizado
                └─ GarantiaContrato[] (fianzas)
```

**Ejemplo de flujo:**
1. Se crea un `ExpedienteContratacion` para "Compra de 100 laptops"
2. Se configura la `FasePreparatoria` con especificaciones técnicas
3. Se define el `CronogramaExpediente` con fechas límite
4. Proveedores retiran el pliego → `AdquirentePliego`
5. Proveedores presentan ofertas → `OfertaPresentada`
6. La comisión evalúa → `EvaluacionResultados`
7. Se selecciona ganador → `Adjudicacion`
8. Se firma → `ContratoFormalizado`
9. Se registran fianzas → `GarantiaContrato`

---

### 📄 Capa 3: Documentos y Colaboración (4 modelos)

#### `DocumentoGenerado`
PDFs/DOCX generados automáticamente:
- Pliego de condiciones
- Acta de apertura
- Contrato oficial
- **Versionado**: Múltiples versiones del mismo documento

#### `SessionEdicion` ⭐ (Colaboración en Tiempo Real)
Control de edición concurrente:
```prisma
{
  documentoId: "doc-123",
  usuarioId: "user-456",
  bloqueado: true,           // Usuario editando ahora
  ultimaActividad: "2024-02-03T10:30:00Z"
}
```

**Flujo:**
1. Usuario A abre documento → Se crea `SessionEdicion`
2. Usuario B intenta editar → Ve "Bloqueado por Usuario A"
3. Usuario A cierra → `bloqueado = false`

#### `ManualGenerado`
Manuales de normas y procedimientos del Ente.

---

## 🔐 Estrategia de Aislamiento Multi-Tenant

### Regla de Oro
**TODAS las queries deben filtrarse por `enteId`**

### Implementación en NestJS

```typescript
// ❌ INCORRECTO - Expone datos de todos los Entes
const expedientes = await prisma.expedienteContratacion.findMany();

// ✅ CORRECTO - Solo del Ente actual
const expedientes = await prisma.expedienteContratacion.findMany({
  where: { enteId: currentUser.enteId }
});
```

### Middleware de Prisma (Protección Automática)

```typescript
prisma.$use(async (params, next) => {
  if (params.model && params.action.includes('find')) {
    params.args.where = {
      ...params.args.where,
      enteId: currentEnteId // Auto-inyectado
    };
  }
  return next(params);
});
```

---

## 🔄 Control de Concurrencia

### Optimistic Locking

```prisma
model ExpedienteContratacion {
  version Int @default(1)
}
```

**Flujo:**
1. Usuario lee `expediente` (version=1)
2. Usuario modifica y guarda
3. Sistema verifica: ¿La version sigue siendo 1?
   - ✅ Sí → Guarda y aumenta version a 2
   - ❌ No → Rechaza: "Otro usuario modificó este registro"

**Código:**
```typescript
await prisma.expedienteContratacion.update({
  where: {
    id: expedienteId,
    version: currentVersion  // Condición crítica
  },
  data: {
    montoEstimadoBs: newMonto,
    version: { increment: 1 }
  }
});
```

---

## 📊 Índices Clave

```prisma
@@index([enteId, estatusProceso])  // Filtro frecuente
@@index([codigoNomenclatura])      // Búsqueda única
@@index([tabla, registroId])       // Auditoría
```

**Impacto:**
- Queries 100x más rápidas en tablas grandes
- Búsquedas por Ente + Estado instantáneas

---

## 🗂️ Soft Deletes

Todas las tablas tienen `deletedAt`:

```typescript
// No elimina, solo marca
await prisma.proveedor.update({
  where: { id: proveedorId },
  data: { deletedAt: new Date() }
});

// Queries ignoran registros eliminados
await prisma.proveedor.findMany({
  where: { deletedAt: null }
});
```

**Ventajas:**
- Recuperación de datos
- Auditoría completa
- Cumplimiento legal

---

## 🎯 Mejores Prácticas

### 1. Siempre usar UUIDs
```typescript
id: "550e8400-e29b-41d4-a716-446655440000"
```
- Imposibles de predecir
- Seguros para URLs públicas

### 2. Relaciones con Cascada
```prisma
onDelete: Cascade  // Al eliminar expediente, elimina todo relacionado
```

### 3. Campos de Auditoría
```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
createdBy String?
updatedBy String?
```

### 4. Validaciones en Enums
```prisma
enum TipoContratacion {
  OBRAS
  BIENES
  SERVICIOS
}
```
Solo acepta valores predefinidos.

---

## 🚀 Próximos Pasos

1. **Generar migración**: `npx prisma migrate dev --name init`
2. **Crear seeders**: Datos de prueba para cada entidad
3. **Implementar middlewares**: Auto-filtrado por tenant
4. **Configurar Row-Level Security**: En PostgreSQL (opcional)
