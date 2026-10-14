# Montemolín · Open Factory

**Fase 2** — Código versionado, pruebas independientes y quality gate irrenunciable.

---

## Arquitectura

```
src/
├── core/                    ← Núcleo operativo (lógica pura)
│   ├── types.ts             ← Tipos del dominio
│   ├── utils.ts             ← Utilidades puras
│   ├── quality-gate.ts      ← Regla irrenunciable
│   ├── projects.ts          ← Lógica de negocio
│   ├── storage.ts           ← Persistencia (localStorage)
│   └── index.ts             ← Barrel export
├── __tests__/               ← Pruebas independientes
│   ├── quality-gate.test.ts ← Tests del gate (14 casos)
│   └── projects.test.ts     ← Tests de negocio (16 casos)
├── App.tsx                  ← UI (componentes React)
├── main.tsx                 ← Entry point
└── index.css                ← Estilos
```

### Principios

1. **Separación de responsabilidades**: El núcleo (`core/`) no conoce React ni el DOM.
2. **Funciones puras**: Toda la lógica de negocio es determinista y testeable.
3. **Inmutabilidad**: Las funciones devuelven nuevo estado, nunca mutan.
4. **Pruebas independientes**: Se ejecutan sin navegador, sin mocks de DOM.

---

## Regla irrenunciable

> **Ninguna entrega podrá aprobarse cuando falle una prueba obligatoria,
> aunque la IA declare que funciona.**

### Implementación

El módulo `core/quality-gate.ts` contiene la función `evaluateQualityGate()` que:

1. Identifica todas las pruebas marcadas como `mandatory: true`.
2. Si alguna tiene `status: 'fail'` → el gate retorna `canApprove: false`.
3. Cuando el gate falla:
   - Las evidencias no verificadas se marcan como `blocked: true`.
   - No se puede verificar ninguna evidencia nueva.
   - No se puede completar el proyecto.
   - La UI muestra un indicador rojo 🔴 con el mensaje de bloqueo.

### Flujo

```
Prueba obligatoria falla
  → evaluateQualityGate() retorna canApprove: false
    → applyGateToEvidence() bloquea evidencias pendientes
      → tryVerifyEvidence() retorna null
        → UI muestra "⛔ BLOQUEADO"
          → Ninguna acción de aprobación se ejecuta
```

---

## Ejecutar pruebas

```bash
npx vitest run
```

### Cobertura

- **quality-gate.test.ts**: 14 casos que verifican la regla irrenunciable.
- **projects.test.ts**: 16 casos que verifican la lógica de negocio.

---

## Exportar / Importar

Los datos se almacenan en `localStorage` bajo la clave `montemolin-open-factory-v2`.
Usa los botones "Exportar" e "Importar" para crear copias de seguridad en JSON.
