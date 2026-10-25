/**
 * Métricas de cumplimiento — Dashboard analítico
 *
 * Calcula métricas agregadas sobre el estado del sistema.
 * Función pura: recibe AppData, retorna ComplianceMetrics.
 */

import type { AppData, ComplianceMetrics } from './types';
import { evaluateQualityGate } from './quality-gate';

export function calculateComplianceMetrics(data: AppData): ComplianceMetrics {
  const projects = data.projects;

  // Proyectos
  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === 'completed').length;

  // Tests agregados
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let pendingTests = 0;
  let mandatoryTests = 0;
  let mandatoryPassed = 0;
  let mandatoryFailed = 0;

  for (const p of projects) {
    for (const t of p.tests) {
      totalTests++;
      if (t.status === 'pass') passedTests++;
      if (t.status === 'fail') failedTests++;
      if (t.status === 'pending') pendingTests++;
      if (t.mandatory) {
        mandatoryTests++;
        if (t.status === 'pass') mandatoryPassed++;
        if (t.status === 'fail') mandatoryFailed++;
      }
    }
  }

  // Evidencias agregadas
  let totalEvidence = 0;
  let verifiedEvidence = 0;
  let blockedEvidence = 0;
  let unlinkedEvidence = 0;

  for (const p of projects) {
    for (const e of p.evidence) {
      totalEvidence++;
      if (e.verified) verifiedEvidence++;
      if (e.blocked) blockedEvidence++;
      if (!e.linkedTaskId) unlinkedEvidence++;
    }
  }

  // Tareas agregadas
  let totalTasks = 0;
  let completedTasks = 0;
  for (const p of projects) {
    totalTasks += p.tasks.length;
    completedTasks += p.tasks.filter((t) => t.completed).length;
  }

  // Proyectos bloqueados
  const blockedProjects = projects.filter((p) => {
    const gate = evaluateQualityGate(p);
    return !gate.canApprove;
  }).length;

  // Tasa de cumplimiento: % de pruebas obligatorias que pasan
  const complianceRate =
    mandatoryTests > 0
      ? Math.round((mandatoryPassed / mandatoryTests) * 100)
      : 100;

  // Tasa de trazabilidad: % de evidencias vinculadas a tarea
  const traceabilityRate =
    totalEvidence > 0
      ? Math.round(((totalEvidence - unlinkedEvidence) / totalEvidence) * 100)
      : 100;

  return {
    totalProjects,
    completedProjects,
    blockedProjects,
    totalTests,
    passedTests,
    failedTests,
    pendingTests,
    mandatoryTests,
    mandatoryPassed,
    mandatoryFailed,
    totalEvidence,
    verifiedEvidence,
    blockedEvidence,
    unlinkedEvidence,
    totalTasks,
    completedTasks,
    complianceRate,
    traceabilityRate,
  };
}
