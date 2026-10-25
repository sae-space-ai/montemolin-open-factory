# Montemolín · Open Factory

**Fase 3** — Trazabilidad, búsqueda global, dashboard de cumplimiento e informes.

---

## Arquitectura

```
src/
├── core/                        ← Núcleo operativo (lógica pura)
│   ├── types.ts                 ← Tipos del dominio (Fase 3)
│   ├── utils.ts                 ← Utilidades puras
│   ├── quality-gate.ts          ← Regla irrenunciable
│   ├── projects.ts              ← Lógica de negocio + Activity Log
│   ├── storage.ts               ← Persistencia con migración
│   ├── activity-log.ts          ← Registro inmutable de acciones
│   ├── search.ts                ← Búsqueda global
│   ├── compliance.ts            ← Métricas de cumplimiento
│   ├── report.ts                ← Generación de informes Markdown
│   └── index.ts                 ← Barrel export
├── __tests__/                   ← Pruebas independientes (60+ casos)
│   ├── quality-gate.test.ts     ← Tests del gate
│   ├── projects.test.ts         ← Tests de negocio + log
│   └── phase3.test.ts           ← Tests de Fase 3
├── App.tsx                      ← UI completa
├── main.tsx                     ← Entry point
└── index.css                    ← Estilos
```

---

## Fase 3 — Novedades

### 1. Activity Log (Registro de Actividad)
- Cada acción significativa se registra con timestamp
- Log inmutable (append-only)
- Consultas por proyecto, tipo de acción, recientes
- Timeline visual en la UI

### 2. Trazabilidad
- Evidencias vinculables a tareas específicas
- Selector de vinculación en la UI
- Métrica de trazabilidad (% evidencias vinculadas)
- Indicador visual 🔗 en evidencias vinculadas

### 3. Búsqueda Global
- Busca en proyectos, tareas, evidencias y pruebas
- Case-insensitive
- Resultados ordenados por tipo
- Click para navegar al proyecto

### 4. Dashboard de Cumplimiento
- Tasa de cumplimiento (% pruebas obligatorias que pasan)
- Tasa de trazabilidad (% evidencias vinculadas)
- Métricas agregadas de proyectos, pruebas, evidencias, tareas
- Barras de progreso visuales

### 5. Exportación de Informes
- Genera informe completo en Markdown
- Incluye métricas, estado de pruebas, evidencias, tareas
- Registro de actividad reciente
- Descarga directa como archivo `.md`

---

## Regla Irrenunciable

> **Ninguna entrega podrá aprobarse cuando falle una prueba obligatoria,
> aunque la IA declare que funciona.**

Implementada en `core/quality-gate.ts` y reforzada en toda la cadena:
- `evaluateQualityGate()` → evalúa el gate
- `applyGateToEvidence()` → bloquea evidencias
- `tryVerifyEvidence()` → impide verificación
- `tryCompleteProject()` → impide completado
- UI → deshabilita botones y muestra indicadores

---

## Ejecutar pruebas

```bash
# Todos los tests
npx vitest run

# Solo Fase 3
npx vitest run src/__tests__/phase3.test.ts

# Modo watch
npx vitest
```

### Cobertura

- **quality-gate.test.ts**: 14 casos
- **projects.test.ts**: 20 casos (incluye activity log)
- **phase3.test.ts**: 26 casos (activity log, search, compliance, report)

**Total: 60+ casos de prueba**

---

## Migración de datos

La aplicación migra automáticamente datos de fases anteriores:
- Añade `activityLog` vacío si no existe
- Añade `linkedTaskId: null` a evidencias antiguas
- Compatible con imports de JSON de Fase 2

---

## Estructura de datos

```typescript
interface AppData {
  projects: Project[];
  activityLog: ActivityLog;  // ← Fase 3
}

interface Evidence {
  id: string;
  description: string;
  date: string;
  verified: boolean;
  blocked: boolean;
  linkedTaskId: string | null;  // ← Fase 3
}

interface ActivityEntry {
  id: string;
  timestamp: string;
  action: ActivityAction;
  projectId: string | null;
  projectName: string;
  detail: string;
}
```

---

## Principios

1. **Separación de responsabilidades** — `core/` no conoce React ni DOM
2. **Funciones puras** — Toda la lógica es determinista y testeable
3. **Inmutabilidad** — Las funciones devuelven nuevo estado
4. **Trazabilidad completa** — Cada acción queda registrada
5. **Regla irrenunciable** — El gate bloquea aprobaciones con fallos
