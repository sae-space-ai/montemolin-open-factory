/**
 * Tests — Quality Gate
 *
 * Pruebas independientes que verifican la regla irrenunciable:
 * «Ninguna entrega podrá aprobarse cuando falle una prueba obligatoria.»
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateQualityGate,
  applyGateToEvidence,
  tryVerifyEvidence,
  tryCompleteProject,
  gateMessage,
} from '../core/quality-gate';
import type { Project, Evidence } from '../core/types';

// ─── Fixtures ──────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'test-project',
    title: 'Test',
    description: 'Test project',
    revision: 1,
    status: 'construction',
    tasks: [],
    evidence: [],
    tests: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: 'ev-1',
    description: 'Evidencia de prueba',
    date: '2024-01-01T00:00:00.000Z',
    verified: false,
    blocked: false,
    linkedTaskId: null,
    ...overrides,
  };
}

// ─── evaluateQualityGate ───────────────────────────────────────────

describe('evaluateQualityGate', () => {
  it('debe permitir aprobar cuando no hay pruebas', () => {
    const project = makeProject({ tests: [] });
    const result = evaluateQualityGate(project);
    expect(result.canApprove).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.mandatoryFailed).toHaveLength(0);
  });

  it('debe permitir aprobar cuando todas las obligatorias pasan', () => {
    const project = makeProject({
      tests: [
        { id: 't1', name: 'Test A', mandatory: true, status: 'pass', lastRun: null },
        { id: 't2', name: 'Test B', mandatory: true, status: 'pass', lastRun: null },
      ],
    });
    const result = evaluateQualityGate(project);
    expect(result.canApprove).toBe(true);
    expect(result.totalMandatory).toBe(2);
    expect(result.totalPassed).toBe(2);
  });

  it('debe BLOQUEAR cuando una prueba obligatoria falla', () => {
    const project = makeProject({
      tests: [
        { id: 't1', name: 'Test A', mandatory: true, status: 'pass', lastRun: null },
        { id: 't2', name: 'Test B', mandatory: true, status: 'fail', lastRun: null },
      ],
    });
    const result = evaluateQualityGate(project);
    expect(result.canApprove).toBe(false);
    expect(result.mandatoryFailed).toHaveLength(1);
    expect(result.mandatoryFailed[0].name).toBe('Test B');
  });

  it('NO debe bloquear cuando una prueba NO obligatoria falla', () => {
    const project = makeProject({
      tests: [
        { id: 't1', name: 'Test A', mandatory: true, status: 'pass', lastRun: null },
        { id: 't2', name: 'Test B', mandatory: false, status: 'fail', lastRun: null },
      ],
    });
    const result = evaluateQualityGate(project);
    expect(result.canApprove).toBe(true);
    expect(result.totalFailed).toBe(1);
  });

  it('debe contar correctamente pending, pass y fail', () => {
    const project = makeProject({
      tests: [
        { id: 't1', name: 'A', mandatory: true, status: 'pass', lastRun: null },
        { id: 't2', name: 'B', mandatory: true, status: 'fail', lastRun: null },
        { id: 't3', name: 'C', mandatory: false, status: 'pending', lastRun: null },
        { id: 't4', name: 'D', mandatory: false, status: 'pass', lastRun: null },
      ],
    });
    const result = evaluateQualityGate(project);
    expect(result.totalPassed).toBe(2);
    expect(result.totalFailed).toBe(1);
    expect(result.totalPending).toBe(1);
    expect(result.totalMandatory).toBe(2);
  });
});

// ─── applyGateToEvidence ───────────────────────────────────────────

describe('applyGateToEvidence', () => {
  it('debe desbloquear todas las evidencias cuando el gate pasa', () => {
    const evidence = [
      makeEvidence({ id: 'e1', blocked: true }),
      makeEvidence({ id: 'e2', blocked: true, verified: true }),
    ];
    const gate = evaluateQualityGate(makeProject({ tests: [] }));
    const result = applyGateToEvidence(evidence, gate);
    expect(result.every((e) => !e.blocked)).toBe(true);
  });

  it('debe bloquear evidencias no verificadas cuando el gate falla', () => {
    const evidence = [
      makeEvidence({ id: 'e1', verified: false, blocked: false }),
      makeEvidence({ id: 'e2', verified: true, blocked: false }),
    ];
    const gate = evaluateQualityGate(
      makeProject({
        tests: [{ id: 't1', name: 'X', mandatory: true, status: 'fail', lastRun: null }],
      })
    );
    const result = applyGateToEvidence(evidence, gate);
    expect(result[0].blocked).toBe(true);  // no verificada → bloqueada
    expect(result[1].blocked).toBe(false); // ya verificada → no se bloquea
  });
});

// ─── tryVerifyEvidence ─────────────────────────────────────────────

describe('tryVerifyEvidence', () => {
  it('debe retornar null cuando el gate está bloqueado', () => {
    const evidence = makeEvidence();
    const gate = evaluateQualityGate(
      makeProject({
        tests: [{ id: 't1', name: 'X', mandatory: true, status: 'fail', lastRun: null }],
      })
    );
    const result = tryVerifyEvidence(evidence, gate);
    expect(result).toBeNull();
  });

  it('debe retornar evidencia verificada cuando el gate pasa', () => {
    const evidence = makeEvidence();
    const gate = evaluateQualityGate(makeProject({ tests: [] }));
    const result = tryVerifyEvidence(evidence, gate);
    expect(result).not.toBeNull();
    expect(result!.verified).toBe(true);
    expect(result!.blocked).toBe(false);
  });
});

// ─── tryCompleteProject ────────────────────────────────────────────

describe('tryCompleteProject', () => {
  it('no debe completar el proyecto si el gate falla', () => {
    const project = makeProject({
      status: 'construction',
      tests: [{ id: 't1', name: 'X', mandatory: true, status: 'fail', lastRun: null }],
    });
    const gate = evaluateQualityGate(project);
    const result = tryCompleteProject(project, gate);
    expect(result.status).toBe('construction'); // sin cambios
  });

  it('debe completar el proyecto si el gate pasa', () => {
    const project = makeProject({
      status: 'construction',
      tests: [{ id: 't1', name: 'X', mandatory: true, status: 'pass', lastRun: null }],
    });
    const gate = evaluateQualityGate(project);
    const result = tryCompleteProject(project, gate);
    expect(result.status).toBe('completed');
  });
});

// ─── gateMessage ───────────────────────────────────────────────────

describe('gateMessage', () => {
  it('debe indicar bloqueo con nombre de prueba fallida', () => {
    const gate = evaluateQualityGate(
      makeProject({
        tests: [{ id: 't1', name: 'MiTest', mandatory: true, status: 'fail', lastRun: null }],
      })
    );
    const msg = gateMessage(gate);
    expect(msg).toContain('BLOQUEADO');
    expect(msg).toContain('MiTest');
  });

  it('debe indicar gate superado cuando todo pasa', () => {
    const gate = evaluateQualityGate(
      makeProject({
        tests: [{ id: 't1', name: 'X', mandatory: true, status: 'pass', lastRun: null }],
      })
    );
    const msg = gateMessage(gate);
    expect(msg).toContain('superado');
  });
});
