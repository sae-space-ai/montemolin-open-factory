/**
 * Montemolín Open Factory — Tipos centralizados (Fase 3)
 *
 * Todas las entidades del dominio se definen aquí.
 * Ningún módulo de negocio ni componente debe redefinirlas.
 */

// ─── Identificadores ───────────────────────────────────────────────
export type Id = string;

// ─── Pruebas (tests) ───────────────────────────────────────────────
export type TestStatus = 'pass' | 'fail' | 'pending';

export interface ProjectTest {
  id: Id;
  name: string;
  mandatory: boolean;
  status: TestStatus;
  lastRun: string | null;
}

// ─── Tareas ────────────────────────────────────────────────────────
export interface Task {
  id: Id;
  title: string;
  completed: boolean;
}

// ─── Evidencias ────────────────────────────────────────────────────
export interface Evidence {
  id: Id;
  description: string;
  date: string;
  verified: boolean;
  blocked: boolean;
  /** ID de la tarea asociada (trazabilidad) */
  linkedTaskId: Id | null;
}

// ─── Proyecto ──────────────────────────────────────────────────────
export type ProjectStatus = 'construction' | 'review' | 'completed';

export interface Project {
  id: Id;
  title: string;
  description: string;
  revision: number;
  status: ProjectStatus;
  tasks: Task[];
  evidence: Evidence[];
  tests: ProjectTest[];
  createdAt: string;
}

// ─── Activity Log ──────────────────────────────────────────────────
export type ActivityAction =
  | 'project.created'
  | 'project.status_changed'
  | 'project.revision_incremented'
  | 'task.added'
  | 'task.toggled'
  | 'task.deleted'
  | 'evidence.added'
  | 'evidence.verified'
  | 'evidence.blocked'
  | 'evidence.deleted'
  | 'test.added'
  | 'test.status_changed'
  | 'test.deleted'
  | 'gate.blocked'
  | 'gate.passed'
  | 'data.imported'
  | 'data.exported';

export interface ActivityEntry {
  id: Id;
  timestamp: string;
  action: ActivityAction;
  projectId: Id | null;
  projectName: string;
  detail: string;
}

export interface ActivityLog {
  entries: ActivityEntry[];
}

// ─── Raíz de datos ─────────────────────────────────────────────────
export interface AppData {
  projects: Project[];
  activityLog: ActivityLog;
}

// ─── Resultado del Quality Gate ────────────────────────────────────
export interface QualityGateResult {
  passed: boolean;
  mandatoryFailed: ProjectTest[];
  totalMandatory: number;
  totalPassed: number;
  totalFailed: number;
  totalPending: number;
  canApprove: boolean;
}

// ─── Resultado de búsqueda ─────────────────────────────────────────
export type SearchResultType = 'project' | 'task' | 'evidence' | 'test';

export interface SearchResult {
  type: SearchResultType;
  projectId: Id;
  projectName: string;
  itemId: Id;
  title: string;
  subtitle: string;
  matched: boolean;
}

// ─── Métricas de cumplimiento ──────────────────────────────────────
export interface ComplianceMetrics {
  totalProjects: number;
  completedProjects: number;
  blockedProjects: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  mandatoryTests: number;
  mandatoryPassed: number;
  mandatoryFailed: number;
  totalEvidence: number;
  verifiedEvidence: number;
  blockedEvidence: number;
  unlinkedEvidence: number;
  totalTasks: number;
  completedTasks: number;
  complianceRate: number; // 0-100
  traceabilityRate: number; // 0-100 (% evidencias vinculadas a tarea)
}
