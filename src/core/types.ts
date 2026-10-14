/**
 * Montemolín Open Factory — Tipos centralizados
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
  mandatory: boolean;       // Si true, bloquea la entrega al fallar
  status: TestStatus;
  lastRun: string | null;   // ISO timestamp
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
  date: string;             // ISO timestamp
  verified: boolean;        // Verificada por ejecutor
  blocked: boolean;         // Bloqueada por quality gate
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

// ─── Raíz de datos ─────────────────────────────────────────────────
export interface AppData {
  projects: Project[];
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
