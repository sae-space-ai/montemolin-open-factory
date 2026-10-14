/**
 * Quality Gate — Regla irrenunciable
 *
 * «Ninguna entrega podrá aprobarse cuando falle una prueba obligatoria,
 *  aunque la IA declare que funciona.»
 *
 * Este módulo contiene SOLO lógica pura. No accede a DOM, ni a estado,
 * ni a servicios externos. Es 100 % testeable de forma independiente.
 */

import type { Project, ProjectTest, Evidence, QualityGateResult } from './types';

// ─── Evaluación del gate ───────────────────────────────────────────

/**
 * Evalúa si un proyecto puede aprobar una entrega.
 *
 * Reglas:
 * 1. Si existe al menos una prueba obligatoria con status 'fail' → BLOQUEADO.
 * 2. Si no hay pruebas obligatorias → no hay bloqueo por gate.
 * 3. Las pruebas no obligatorias no bloquean, solo informan.
 */
export function evaluateQualityGate(project: Project): QualityGateResult {
  const tests = project.tests;

  const mandatoryTests = tests.filter((t) => t.mandatory);
  const mandatoryFailed = mandatoryTests.filter((t) => t.status === 'fail');

  const totalMandatory = mandatoryTests.length;
  const totalPassed = tests.filter((t) => t.status === 'pass').length;
  const totalFailed = tests.filter((t) => t.status === 'fail').length;
  const totalPending = tests.filter((t) => t.status === 'pending').length;

  const canApprove = mandatoryFailed.length === 0;

  return {
    passed: canApprove,
    mandatoryFailed,
    totalMandatory,
    totalPassed,
    totalFailed,
    totalPending,
    canApprove,
  };
}

// ─── Aplicar gate a evidencias ─────────────────────────────────────

/**
 * Marca como bloqueadas las evidencias no verificadas cuando el gate falla.
 * Devuelve un nuevo array de evidencias (inmutabilidad).
 */
export function applyGateToEvidence(
  evidence: Evidence[],
  gateResult: QualityGateResult
): Evidence[] {
  if (gateResult.canApprove) {
    // Gate pasa: desbloquear todas las evidencias
    return evidence.map((e) => ({ ...e, blocked: false }));
  }
  // Gate bloquea: marcar como bloqueadas las no verificadas
  return evidence.map((e) => ({
    ...e,
    blocked: !e.verified,
  }));
}

// ─── Verificar entrega ─────────────────────────────────────────────

/**
 * Intenta aprobar una evidencia.
 * Retorna null si el gate lo impide (prueba obligatoria fallando).
 * Retorna la evidencia actualizada si se permite.
 */
export function tryVerifyEvidence(
  evidence: Evidence,
  gateResult: QualityGateResult
): Evidence | null {
  if (!gateResult.canApprove) {
    return null; // BLOQUEADO — regla irrenunciable
  }
  return { ...evidence, verified: true, blocked: false };
}

// ─── Cambiar estado de proyecto ────────────────────────────────────

/**
 * Intenta mover un proyecto a 'completed'.
 * Si el gate no pasa, retorna el proyecto sin cambios.
 */
export function tryCompleteProject(
  project: Project,
  gateResult: QualityGateResult
): Project {
  if (!gateResult.canApprove) {
    return project; // BLOQUEADO
  }
  return { ...project, status: 'completed' };
}

// ─── Resumen para UI ───────────────────────────────────────────────

/**
 * Genera un mensaje legible del estado del gate.
 */
export function gateMessage(gateResult: QualityGateResult): string {
  if (gateResult.canApprove) {
    if (gateResult.totalMandatory === 0) {
      return 'Sin pruebas obligatorias — sin bloqueo.';
    }
    return `Gate superado: ${gateResult.totalPassed}/${gateResult.totalMandatory} obligatorias en verde.`;
  }
  const names = gateResult.mandatoryFailed.map((t) => `«${t.name}»`).join(', ');
  return `BLOQUEADO: falla obligatoria en ${names}. Ninguna entrega puede aprobarse.`;
}
