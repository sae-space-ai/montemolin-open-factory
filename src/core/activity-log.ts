/**
 * Activity Log — Registro inmutable de acciones
 *
 * Cada acción significativa del sistema se registra aquí.
 * El log es append-only: nunca se modifican ni eliminan entradas.
 * Esto proporciona trazabilidad completa del trabajo realizado.
 */

import type { ActivityLog, ActivityEntry, ActivityAction, Id } from './types';
import { generateId, nowISO } from './utils';

// ─── Crear log vacío ───────────────────────────────────────────────

export function createEmptyLog(): ActivityLog {
  return { entries: [] };
}

// ─── Añadir entrada ────────────────────────────────────────────────

export function appendEntry(
  log: ActivityLog,
  action: ActivityAction,
  projectId: Id | null,
  projectName: string,
  detail: string
): ActivityLog {
  const entry: ActivityEntry = {
    id: generateId(),
    timestamp: nowISO(),
    action,
    projectId,
    projectName,
    detail,
  };
  // Las entradas más recientes van primero
  return { entries: [entry, ...log.entries] };
}

// ─── Consultas ─────────────────────────────────────────────────────

/** Obtiene las últimas N entradas. */
export function getRecentEntries(log: ActivityLog, limit: number): ActivityEntry[] {
  return log.entries.slice(0, limit);
}

/** Filtra entradas por proyecto. */
export function getEntriesByProject(log: ActivityLog, projectId: Id): ActivityEntry[] {
  return log.entries.filter((e) => e.projectId === projectId);
}

/** Filtra entradas por tipo de acción. */
export function getEntriesByAction(log: ActivityLog, action: ActivityAction): ActivityEntry[] {
  return log.entries.filter((e) => e.action === action);
}

/** Cuenta de entradas por tipo de acción. */
export function countByAction(log: ActivityLog): Record<ActivityAction, number> {
  const counts = {} as Record<ActivityAction, number>;
  for (const entry of log.entries) {
    counts[entry.action] = (counts[entry.action] || 0) + 1;
  }
  return counts;
}

/** Total de entradas en el log. */
export function totalEntries(log: ActivityLog): number {
  return log.entries.length;
}

// ─── Mensajes predefinidos ─────────────────────────────────────────

export function formatActionLabel(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    'project.created': 'Proyecto creado',
    'project.status_changed': 'Estado cambiado',
    'project.revision_incremented': 'Revisión incrementada',
    'task.added': 'Tarea añadida',
    'task.toggled': 'Tarea completada/pendiente',
    'task.deleted': 'Tarea eliminada',
    'evidence.added': 'Evidencia añadida',
    'evidence.verified': 'Evidencia verificada',
    'evidence.blocked': 'Evidencia bloqueada',
    'evidence.deleted': 'Evidencia eliminada',
    'test.added': 'Prueba añadida',
    'test.status_changed': 'Estado de prueba cambiado',
    'test.deleted': 'Prueba eliminada',
    'gate.blocked': 'Gate bloqueado',
    'gate.passed': 'Gate superado',
    'data.imported': 'Datos importados',
    'data.exported': 'Datos exportados',
  };
  return labels[action] || action;
}
