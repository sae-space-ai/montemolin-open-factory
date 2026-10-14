/**
 * Tests — Lógica de proyectos
 *
 * Verifica que las operaciones de negocio (crear, actualizar,
 * añadir tareas, verificar evidencias) funcionan correctamente
 * y respetan el quality gate.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialData,
  createProject,
  addTask,
  toggleTask,
  deleteTask,
  addEvidence,
  verifyEvidence,
  deleteEvidence,
  addTest,
  setTestStatus,
  setProjectStatus,
  getStats,
} from '../core/projects';

// ─── Crear datos ───────────────────────────────────────────────────

describe('createInitialData', () => {
  it('debe crear datos con al menos un proyecto', () => {
    const data = createInitialData();
    expect(data.projects.length).toBeGreaterThanOrEqual(1);
  });

  it('el proyecto inicial debe tener pruebas', () => {
    const data = createInitialData();
    expect(data.projects[0].tests.length).toBeGreaterThan(0);
  });
});

// ─── Crear proyecto ────────────────────────────────────────────────

describe('createProject', () => {
  it('debe añadir un proyecto a la lista', () => {
    const data = createInitialData();
    const initial = data.projects.length;
    const updated = createProject(data, 'Nuevo', 'Desc');
    expect(updated.projects.length).toBe(initial + 1);
  });

  it('el nuevo proyecto debe tener status construction', () => {
    const data = createInitialData();
    const updated = createProject(data, 'Nuevo', 'Desc');
    const last = updated.projects[updated.projects.length - 1];
    expect(last.status).toBe('construction');
    expect(last.title).toBe('Nuevo');
  });

  it('debe usar descripción por defecto si está vacía', () => {
    const data = createInitialData();
    const updated = createProject(data, 'Nuevo', '');
    const last = updated.projects[updated.projects.length - 1];
    expect(last.description).toBe('Sin descripción.');
  });
});

// ─── Tareas ────────────────────────────────────────────────────────

describe('tareas', () => {
  it('addTask debe añadir una tarea al proyecto', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    const updated = addTask(data, pid, 'Mi tarea');
    const project = updated.projects.find((p) => p.id === pid)!;
    expect(project.tasks).toHaveLength(1);
    expect(project.tasks[0].title).toBe('Mi tarea');
    expect(project.tasks[0].completed).toBe(false);
  });

  it('toggleTask debe cambiar el estado de completado', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    let updated = addTask(data, pid, 'Tarea');
    const tid = updated.projects[0].tasks[0].id;
    updated = toggleTask(updated, pid, tid);
    expect(updated.projects[0].tasks[0].completed).toBe(true);
    updated = toggleTask(updated, pid, tid);
    expect(updated.projects[0].tasks[0].completed).toBe(false);
  });

  it('deleteTask debe eliminar la tarea', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    let updated = addTask(data, pid, 'Tarea');
    const tid = updated.projects[0].tasks[0].id;
    updated = deleteTask(updated, pid, tid);
    expect(updated.projects[0].tasks).toHaveLength(0);
  });
});

// ─── Evidencias y Quality Gate ─────────────────────────────────────

describe('evidencias + quality gate', () => {
  it('addEvidence debe añadir una evidencia', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    const updated = addEvidence(data, pid, 'Screenshot');
    const project = updated.projects.find((p) => p.id === pid)!;
    expect(project.evidence).toHaveLength(1);
    expect(project.evidence[0].verified).toBe(false);
  });

  it('verifyEvidence debe verificar cuando el gate pasa', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    let updated = addEvidence(data, pid, 'Screenshot');
    const eid = updated.projects[0].evidence[0].id;
    const result = verifyEvidence(updated, pid, eid);
    expect(result.blocked).toBe(false);
    const project = result.data.projects.find((p) => p.id === pid)!;
    expect(project.evidence[0].verified).toBe(true);
  });

  it('verifyEvidence debe BLOQUEAR cuando una prueba obligatoria falla', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    // Hacer fallar una prueba obligatoria
    const testId = data.projects[0].tests.find((t) => t.mandatory)!.id;
    let updated = setTestStatus(data, pid, testId, 'fail');
    // Añadir evidencia
    updated = addEvidence(updated, pid, 'Screenshot');
    const eid = updated.projects[0].evidence[0].id;
    // Intentar verificar
    const result = verifyEvidence(updated, pid, eid);
    expect(result.blocked).toBe(true);
    // La evidencia NO debe estar verificada
    const project = result.data.projects.find((p) => p.id === pid)!;
    expect(project.evidence[0].verified).toBe(false);
    expect(project.evidence[0].blocked).toBe(true);
  });
});

// ─── Pruebas ───────────────────────────────────────────────────────

describe('pruebas (tests)', () => {
  it('addTest debe añadir una prueba', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    const updated = addTest(data, pid, 'Nueva prueba', true);
    const project = updated.projects.find((p) => p.id === pid)!;
    const test = project.tests.find((t) => t.name === 'Nueva prueba');
    expect(test).toBeDefined();
    expect(test!.mandatory).toBe(true);
    expect(test!.status).toBe('pending');
  });

  it('setTestStatus debe actualizar el estado', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    const tid = data.projects[0].tests[0].id;
    const updated = setTestStatus(data, pid, tid, 'fail');
    const test = updated.projects[0].tests.find((t) => t.id === tid)!;
    expect(test.status).toBe('fail');
    expect(test.lastRun).not.toBeNull();
  });
});

// ─── Completar proyecto ────────────────────────────────────────────

describe('setProjectStatus', () => {
  it('no debe completar si el gate falla', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    const testId = data.projects[0].tests.find((t) => t.mandatory)!.id;
    const updated = setTestStatus(data, pid, testId, 'fail');
    const result = setProjectStatus(updated, pid, 'completed');
    expect(result.blocked).toBe(true);
    const project = result.data.projects.find((p) => p.id === pid)!;
    expect(project.status).not.toBe('completed');
  });

  it('debe completar si el gate pasa', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    // Todas las obligatorias en pass
    const result = setProjectStatus(data, pid, 'completed');
    expect(result.blocked).toBe(false);
    const project = result.data.projects.find((p) => p.id === pid)!;
    expect(project.status).toBe('completed');
  });
});

// ─── Estadísticas ──────────────────────────────────────────────────

describe('getStats', () => {
  it('debe calcular estadísticas correctamente', () => {
    let data = createInitialData();
    const pid = data.projects[0].id;
    data = addTask(data, pid, 'T1');
    data = addTask(data, pid, 'T2');
    data = addEvidence(data, pid, 'Ev1');

    const stats = getStats(data);
    expect(stats.totalProjects).toBeGreaterThanOrEqual(1);
    expect(stats.openTasks).toBeGreaterThanOrEqual(2);
    expect(stats.totalEvidence).toBeGreaterThanOrEqual(1);
  });
});
