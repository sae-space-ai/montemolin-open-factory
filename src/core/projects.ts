/**
 * Lógica de negocio de proyectos — funciones puras.
 *
 * Todas las funciones reciben estado y devuelven nuevo estado.
 * Nunca mutan. Nunca acceden a DOM ni localStorage.
 */

import type { AppData, Project, ProjectTest, Task, Evidence, TestStatus, Id } from './types';
import { generateId, nowISO } from './utils';
import { evaluateQualityGate, applyGateToEvidence } from './quality-gate';

// Re-exportar para que los componentes puedan acceder directamente
export { evaluateQualityGate, gateMessage } from './quality-gate';

// ─── Datos iniciales ───────────────────────────────────────────────

export function createInitialData(): AppData {
  return {
    projects: [
      {
        id: generateId(),
        title: 'Gestor de proyectos y evidencias',
        description:
          'Primer encargo interno: registrar solicitudes, organizar tareas, revisar versiones y conservar las pruebas de cada entrega.',
        revision: 1,
        status: 'construction' as const,
        tasks: [],
        evidence: [],
        tests: [
          {
            id: generateId(),
            name: 'Quality Gate bloquea entregas con prueba obligatoria fallando',
            mandatory: true,
            status: 'pass',
            lastRun: nowISO(),
          },
          {
            id: generateId(),
            name: 'Persistencia en localStorage funciona correctamente',
            mandatory: true,
            status: 'pass',
            lastRun: nowISO(),
          },
          {
            id: generateId(),
            name: 'Exportar/importar JSON preserva integridad',
            mandatory: false,
            status: 'pending',
            lastRun: null,
          },
        ],
        createdAt: nowISO(),
      },
    ],
  };
}

// ─── Crear proyecto ────────────────────────────────────────────────

export function createProject(
  data: AppData,
  title: string,
  description: string
): AppData {
  const project: Project = {
    id: generateId(),
    title,
    description: description || 'Sin descripción.',
    revision: 1,
    status: 'construction',
    tasks: [],
    evidence: [],
    tests: [],
    createdAt: nowISO(),
  };
  return { ...data, projects: [...data.projects, project] };
}

// ─── Actualizar proyecto ───────────────────────────────────────────

export function updateProject(data: AppData, updated: Project): AppData {
  // Al actualizar, recalculamos el gate sobre las evidencias
  const gate = evaluateQualityGate(updated);
  const evidence = applyGateToEvidence(updated.evidence, gate);
  const projectWithGate = { ...updated, evidence };

  return {
    ...data,
    projects: data.projects.map((p) =>
      p.id === updated.id ? projectWithGate : p
    ),
  };
}

// ─── Tareas ────────────────────────────────────────────────────────

export function addTask(data: AppData, projectId: Id, title: string): AppData {
  return data.projects.reduce<AppData>(
    (acc, p) => {
      if (p.id !== projectId) return acc;
      const task: Task = { id: generateId(), title, completed: false };
      return updateProject(acc, { ...p, tasks: [...p.tasks, task] });
    },
    data
  );
}

export function toggleTask(data: AppData, projectId: Id, taskId: Id): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const tasks = project.tasks.map((t) =>
    t.id === taskId ? { ...t, completed: !t.completed } : t
  );
  return updateProject(data, { ...project, tasks });
}

export function deleteTask(data: AppData, projectId: Id, taskId: Id): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  return updateProject(data, {
    ...project,
    tasks: project.tasks.filter((t) => t.id !== taskId),
  });
}

// ─── Evidencias ────────────────────────────────────────────────────

export function addEvidence(
  data: AppData,
  projectId: Id,
  description: string
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const ev: Evidence = {
    id: generateId(),
    description,
    date: nowISO(),
    verified: false,
    blocked: false,
  };
  return updateProject(data, { ...project, evidence: [...project.evidence, ev] });
}

export function verifyEvidence(
  data: AppData,
  projectId: Id,
  evidenceId: Id
): { data: AppData; blocked: boolean } {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return { data, blocked: false };

  const gate = evaluateQualityGate(project);
  if (!gate.canApprove) {
    // BLOQUEADO — regla irrenunciable
    const evidence = project.evidence.map((e) =>
      e.id === evidenceId ? { ...e, blocked: true } : e
    );
    return { data: updateProject(data, { ...project, evidence }), blocked: true };
  }

  const evidence = project.evidence.map((e) =>
    e.id === evidenceId ? { ...e, verified: true, blocked: false } : e
  );
  return { data: updateProject(data, { ...project, evidence }), blocked: false };
}

export function deleteEvidence(
  data: AppData,
  projectId: Id,
  evidenceId: Id
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  return updateProject(data, {
    ...project,
    evidence: project.evidence.filter((e) => e.id !== evidenceId),
  });
}

// ─── Pruebas (Tests) ───────────────────────────────────────────────

export function addTest(
  data: AppData,
  projectId: Id,
  name: string,
  mandatory: boolean
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const test: ProjectTest = {
    id: generateId(),
    name,
    mandatory,
    status: 'pending',
    lastRun: null,
  };
  return updateProject(data, { ...project, tests: [...project.tests, test] });
}

export function setTestStatus(
  data: AppData,
  projectId: Id,
  testId: Id,
  status: TestStatus
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const tests = project.tests.map((t) =>
    t.id === testId ? { ...t, status, lastRun: nowISO() } : t
  );
  return updateProject(data, { ...project, tests });
}

export function deleteTest(
  data: AppData,
  projectId: Id,
  testId: Id
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  return updateProject(data, {
    ...project,
    tests: project.tests.filter((t) => t.id !== testId),
  });
}

// ─── Estado del proyecto ───────────────────────────────────────────

export function setProjectStatus(
  data: AppData,
  projectId: Id,
  status: Project['status']
): { data: AppData; blocked: boolean } {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return { data, blocked: false };

  if (status === 'completed') {
    const gate = evaluateQualityGate(project);
    if (!gate.canApprove) {
      return { data, blocked: true };
    }
  }

  return { data: updateProject(data, { ...project, status }), blocked: false };
}

export function incrementRevision(data: AppData, projectId: Id): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  return updateProject(data, { ...project, revision: project.revision + 1 });
}

// ─── Estadísticas ──────────────────────────────────────────────────

export function getStats(data: AppData) {
  const totalProjects = data.projects.length;
  const openTasks = data.projects.reduce(
    (sum, p) => sum + p.tasks.filter((t) => !t.completed).length,
    0
  );
  const totalEvidence = data.projects.reduce((sum, p) => sum + p.evidence.length, 0);
  const verifiedEvidence = data.projects.reduce(
    (sum, p) => sum + p.evidence.filter((e) => e.verified).length,
    0
  );
  const blockedEvidence = data.projects.reduce(
    (sum, p) => sum + p.evidence.filter((e) => e.blocked).length,
    0
  );
  const totalTests = data.projects.reduce((sum, p) => sum + p.tests.length, 0);
  const failedMandatory = data.projects.reduce((sum, p) => {
    const gate = evaluateQualityGate(p);
    return sum + gate.mandatoryFailed.length;
  }, 0);

  return {
    totalProjects,
    openTasks,
    totalEvidence,
    verifiedEvidence,
    blockedEvidence,
    totalTests,
    failedMandatory,
  };
}
