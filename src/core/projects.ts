/**
 * Lógica de negocio de proyectos — funciones puras (Fase 3)
 *
 * Todas las funciones reciben estado y devuelven nuevo estado.
 * Nunca mutan. Nunca acceden a DOM ni localStorage.
 * Ahora integra Activity Log para trazabilidad completa.
 */

import type { AppData, Project, ProjectTest, Task, Evidence, TestStatus, Id } from './types';
import { generateId, nowISO } from './utils';
import { evaluateQualityGate, applyGateToEvidence } from './quality-gate';
import { appendEntry, createEmptyLog } from './activity-log';

// Re-exportar para que los componentes puedan acceder directamente
export { evaluateQualityGate, gateMessage } from './quality-gate';

// ─── Datos iniciales ───────────────────────────────────────────────

export function createInitialData(): AppData {
  const initialProject: Project = {
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
      {
        id: generateId(),
        name: 'Activity Log registra todas las acciones',
        mandatory: true,
        status: 'pass',
        lastRun: nowISO(),
      },
      {
        id: generateId(),
        name: 'Búsqueda global funciona correctamente',
        mandatory: false,
        status: 'pending',
        lastRun: null,
      },
    ],
    createdAt: nowISO(),
  };

  const log = appendEntry(
    createEmptyLog(),
    'project.created',
    initialProject.id,
    initialProject.title,
    'Proyecto inicial creado'
  );

  return {
    projects: [initialProject],
    activityLog: log,
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
  const log = appendEntry(
    data.activityLog,
    'project.created',
    project.id,
    project.title,
    `Proyecto creado: "${title}"`
  );
  return { ...data, projects: [...data.projects, project], activityLog: log };
}

// ─── Actualizar proyecto (sin log — se usa internamente) ───────────

function updateProjectInData(data: AppData, updated: Project): AppData {
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
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const task: Task = { id: generateId(), title, completed: false };
  const updated = { ...project, tasks: [...project.tasks, task] };
  const log = appendEntry(
    data.activityLog,
    'task.added',
    projectId,
    project.title,
    `Tarea añadida: "${title}"`
  );
  return { ...updateProjectInData(data, updated), activityLog: log };
}

export function toggleTask(data: AppData, projectId: Id, taskId: Id): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const tasks = project.tasks.map((t) =>
    t.id === taskId ? { ...t, completed: !t.completed } : t
  );
  const task = project.tasks.find((t) => t.id === taskId);
  const updated = { ...project, tasks };
  const log = appendEntry(
    data.activityLog,
    'task.toggled',
    projectId,
    project.title,
    `Tarea "${task?.title}" → ${task?.completed ? 'pendiente' : 'completada'}`
  );
  return { ...updateProjectInData(data, updated), activityLog: log };
}

export function deleteTask(data: AppData, projectId: Id, taskId: Id): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const task = project.tasks.find((t) => t.id === taskId);
  const updated = {
    ...project,
    tasks: project.tasks.filter((t) => t.id !== taskId),
  };
  const log = appendEntry(
    data.activityLog,
    'task.deleted',
    projectId,
    project.title,
    `Tarea eliminada: "${task?.title}"`
  );
  return { ...updateProjectInData(data, updated), activityLog: log };
}

// ─── Evidencias ────────────────────────────────────────────────────

export function addEvidence(
  data: AppData,
  projectId: Id,
  description: string,
  linkedTaskId: Id | null = null
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const ev: Evidence = {
    id: generateId(),
    description,
    date: nowISO(),
    verified: false,
    blocked: false,
    linkedTaskId,
  };
  const updated = { ...project, evidence: [...project.evidence, ev] };
  const log = appendEntry(
    data.activityLog,
    'evidence.added',
    projectId,
    project.title,
    `Evidencia añadida: "${description}"${linkedTaskId ? ' (vinculada)' : ''}`
  );
  return { ...updateProjectInData(data, updated), activityLog: log };
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
    const evidence = project.evidence.map((e) =>
      e.id === evidenceId ? { ...e, blocked: true } : e
    );
    const log = appendEntry(
      data.activityLog,
      'gate.blocked',
      projectId,
      project.title,
      'Intento de verificación bloqueado por quality gate'
    );
    return {
      data: { ...updateProjectInData(data, { ...project, evidence }), activityLog: log },
      blocked: true,
    };
  }

  const evidence = project.evidence.map((e) =>
    e.id === evidenceId ? { ...e, verified: true, blocked: false } : e
  );
  const ev = project.evidence.find((e) => e.id === evidenceId);
  const log = appendEntry(
    data.activityLog,
    'evidence.verified',
    projectId,
    project.title,
    `Evidencia verificada: "${ev?.description}"`
  );
  return {
    data: { ...updateProjectInData(data, { ...project, evidence }), activityLog: log },
    blocked: false,
  };
}

export function linkEvidenceToTask(
  data: AppData,
  projectId: Id,
  evidenceId: Id,
  taskId: Id | null
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const evidence = project.evidence.map((e) =>
    e.id === evidenceId ? { ...e, linkedTaskId: taskId } : e
  );
  return updateProjectInData(data, { ...project, evidence });
}

export function deleteEvidence(
  data: AppData,
  projectId: Id,
  evidenceId: Id
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const ev = project.evidence.find((e) => e.id === evidenceId);
  const updated = {
    ...project,
    evidence: project.evidence.filter((e) => e.id !== evidenceId),
  };
  const log = appendEntry(
    data.activityLog,
    'evidence.deleted',
    projectId,
    project.title,
    `Evidencia eliminada: "${ev?.description}"`
  );
  return { ...updateProjectInData(data, updated), activityLog: log };
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
  const updated = { ...project, tests: [...project.tests, test] };
  const log = appendEntry(
    data.activityLog,
    'test.added',
    projectId,
    project.title,
    `Prueba añadida: "${name}" (${mandatory ? 'OBL' : 'OPT'})`
  );
  return { ...updateProjectInData(data, updated), activityLog: log };
}

export function setTestStatus(
  data: AppData,
  projectId: Id,
  testId: Id,
  status: TestStatus
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;

  const prevGate = evaluateQualityGate(project);
  const tests = project.tests.map((t) =>
    t.id === testId ? { ...t, status, lastRun: nowISO() } : t
  );
  const updated = { ...project, tests };
  const newGate = evaluateQualityGate(updated);

  let log = data.activityLog;
  log = appendEntry(
    log,
    'test.status_changed',
    projectId,
    project.title,
    `Prueba "${project.tests.find((t) => t.id === testId)?.name}" → ${status}`
  );

  // Registrar cambio de estado del gate
  if (prevGate.canApprove && !newGate.canApprove) {
    log = appendEntry(log, 'gate.blocked', projectId, project.title, 'Quality gate bloqueado');
  } else if (!prevGate.canApprove && newGate.canApprove) {
    log = appendEntry(log, 'gate.passed', projectId, project.title, 'Quality gate superado');
  }

  return { ...updateProjectInData(data, updated), activityLog: log };
}

export function deleteTest(
  data: AppData,
  projectId: Id,
  testId: Id
): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const test = project.tests.find((t) => t.id === testId);
  const updated = {
    ...project,
    tests: project.tests.filter((t) => t.id !== testId),
  };
  const log = appendEntry(
    data.activityLog,
    'test.deleted',
    projectId,
    project.title,
    `Prueba eliminada: "${test?.name}"`
  );
  return { ...updateProjectInData(data, updated), activityLog: log };
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

  const updated = { ...project, status };
  const log = appendEntry(
    data.activityLog,
    'project.status_changed',
    projectId,
    project.title,
    `Estado cambiado a: ${status}`
  );
  return {
    data: { ...updateProjectInData(data, updated), activityLog: log },
    blocked: false,
  };
}

export function incrementRevision(data: AppData, projectId: Id): AppData {
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return data;
  const updated = { ...project, revision: project.revision + 1 };
  const log = appendEntry(
    data.activityLog,
    'project.revision_incremented',
    projectId,
    project.title,
    `Revisión ${project.revision} → ${updated.revision}`
  );
  return { ...updateProjectInData(data, updated), activityLog: log };
}

// ─── Importar datos (con log) ──────────────────────────────────────

export function importData(data: AppData, imported: AppData): AppData {
  const log = appendEntry(
    imported.activityLog,
    'data.imported',
    null,
    'Sistema',
    `Datos importados: ${imported.projects.length} proyectos`
  );
  return { ...imported, activityLog: log };
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
