/**
 * Tests — Activity Log, Search, Compliance y Report (Fase 3)
 */

import { describe, it, expect } from 'vitest';
import {
  createEmptyLog,
  appendEntry,
  getRecentEntries,
  getEntriesByProject,
  getEntriesByAction,
  countByAction,
  totalEntries,
  formatActionLabel,
} from '../core/activity-log';
import { searchAll, searchInProject } from '../core/search';
import { calculateComplianceMetrics } from '../core/compliance';
import { generateFullReport, generateProjectReport } from '../core/report';
import { createInitialData, createProject, addTask, addEvidence, addTest, setTestStatus } from '../core/projects';
import type { AppData } from '../core/types';

// ─── Activity Log ──────────────────────────────────────────────────

describe('activity-log', () => {
  it('createEmptyLog debe crear un log vacío', () => {
    const log = createEmptyLog();
    expect(log.entries).toHaveLength(0);
  });

  it('appendEntry debe añadir una entrada al inicio', () => {
    const log = createEmptyLog();
    const updated = appendEntry(log, 'project.created', 'p1', 'Proyecto 1', 'Creado');
    expect(updated.entries).toHaveLength(1);
    expect(updated.entries[0].action).toBe('project.created');
    expect(updated.entries[0].projectName).toBe('Proyecto 1');
  });

  it('appendEntry debe poner las entradas más recientes primero', () => {
    let log = createEmptyLog();
    log = appendEntry(log, 'project.created', 'p1', 'P1', 'Primero');
    log = appendEntry(log, 'task.added', 'p1', 'P1', 'Segundo');
    expect(log.entries[0].action).toBe('task.added');
    expect(log.entries[1].action).toBe('project.created');
  });

  it('getRecentEntries debe retornar las últimas N entradas', () => {
    let log = createEmptyLog();
    for (let i = 0; i < 10; i++) {
      log = appendEntry(log, 'task.added', 'p1', 'P1', `Tarea ${i}`);
    }
    const recent = getRecentEntries(log, 3);
    expect(recent).toHaveLength(3);
  });

  it('getEntriesByProject debe filtrar por proyecto', () => {
    let log = createEmptyLog();
    log = appendEntry(log, 'project.created', 'p1', 'P1', 'Creado');
    log = appendEntry(log, 'project.created', 'p2', 'P2', 'Creado');
    log = appendEntry(log, 'task.added', 'p1', 'P1', 'Tarea');
    const p1Entries = getEntriesByProject(log, 'p1');
    expect(p1Entries).toHaveLength(2);
  });

  it('getEntriesByAction debe filtrar por acción', () => {
    let log = createEmptyLog();
    log = appendEntry(log, 'project.created', 'p1', 'P1', 'Creado');
    log = appendEntry(log, 'task.added', 'p1', 'P1', 'Tarea');
    log = appendEntry(log, 'task.added', 'p1', 'P1', 'Tarea 2');
    const tasks = getEntriesByAction(log, 'task.added');
    expect(tasks).toHaveLength(2);
  });

  it('countByAction debe contar entradas por tipo', () => {
    let log = createEmptyLog();
    log = appendEntry(log, 'task.added', 'p1', 'P1', 'T1');
    log = appendEntry(log, 'task.added', 'p1', 'P1', 'T2');
    log = appendEntry(log, 'evidence.added', 'p1', 'P1', 'E1');
    const counts = countByAction(log);
    expect(counts['task.added']).toBe(2);
    expect(counts['evidence.added']).toBe(1);
  });

  it('totalEntries debe contar todas las entradas', () => {
    let log = createEmptyLog();
    log = appendEntry(log, 'project.created', 'p1', 'P1', 'Creado');
    log = appendEntry(log, 'task.added', 'p1', 'P1', 'Tarea');
    expect(totalEntries(log)).toBe(2);
  });

  it('formatActionLabel debe retornar etiquetas legibles', () => {
    expect(formatActionLabel('project.created')).toBe('Proyecto creado');
    expect(formatActionLabel('gate.blocked')).toBe('Gate bloqueado');
    expect(formatActionLabel('evidence.verified')).toBe('Evidencia verificada');
  });
});

// ─── Search ────────────────────────────────────────────────────────

describe('search', () => {
  function makeData(): AppData {
    let data = createInitialData();
    const pid = data.projects[0].id;
    data = addTask(data, pid, 'Implementar login');
    data = addTask(data, pid, 'Diseñar dashboard');
    data = addEvidence(data, pid, 'Screenshot del login');
    return data;
  }

  it('searchAll debe encontrar proyectos por título', () => {
    const data = makeData();
    const results = searchAll(data, 'Gestor');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].type).toBe('project');
  });

  it('searchAll debe encontrar tareas', () => {
    const data = makeData();
    const results = searchAll(data, 'login');
    const taskResult = results.find((r) => r.type === 'task' && r.title.includes('login'));
    expect(taskResult).toBeDefined();
  });

  it('searchAll debe encontrar evidencias', () => {
    const data = makeData();
    const results = searchAll(data, 'Screenshot');
    const evResult = results.find((r) => r.type === 'evidence');
    expect(evResult).toBeDefined();
  });

  it('searchAll debe retornar vacío con query vacía', () => {
    const data = makeData();
    const results = searchAll(data, '');
    expect(results).toHaveLength(0);
  });

  it('searchAll debe ser case-insensitive', () => {
    const data = makeData();
    const results = searchAll(data, 'LOGIN');
    expect(results.length).toBeGreaterThan(0);
  });

  it('searchInProject debe buscar solo en un proyecto', () => {
    const data = makeData();
    const pid = data.projects[0].id;
    const results = searchInProject(data, pid, 'login');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.projectId === pid)).toBe(true);
  });
});

// ─── Compliance ────────────────────────────────────────────────────

describe('compliance', () => {
  it('calculateComplianceMetrics debe calcular métricas básicas', () => {
    const data = createInitialData();
    const metrics = calculateComplianceMetrics(data);
    expect(metrics.totalProjects).toBeGreaterThanOrEqual(1);
    expect(metrics.totalTests).toBeGreaterThan(0);
    expect(metrics.complianceRate).toBeGreaterThanOrEqual(0);
    expect(metrics.complianceRate).toBeLessThanOrEqual(100);
  });

  it('complianceRate debe ser 100% si todas las obligatorias pasan', () => {
    const data = createInitialData();
    const metrics = calculateComplianceMetrics(data);
    // El proyecto inicial tiene obligatorias en pass
    expect(metrics.complianceRate).toBe(100);
  });

  it('complianceRate debe bajar si una obligatoria falla', () => {
    const data = createInitialData();
    const pid = data.projects[0].id;
    const testId = data.projects[0].tests.find((t) => t.mandatory)!.id;
    const updated = setTestStatus(data, pid, testId, 'fail');
    const metrics = calculateComplianceMetrics(updated);
    expect(metrics.complianceRate).toBeLessThan(100);
    expect(metrics.mandatoryFailed).toBeGreaterThan(0);
  });

  it('traceabilityRate debe ser 100% si no hay evidencias', () => {
    const data = createInitialData();
    const metrics = calculateComplianceMetrics(data);
    expect(metrics.traceabilityRate).toBe(100);
  });

  it('traceabilityRate debe bajar con evidencias sin vincular', () => {
    let data = createInitialData();
    const pid = data.projects[0].id;
    data = addEvidence(data, pid, 'Sin vincular');
    const metrics = calculateComplianceMetrics(data);
    expect(metrics.traceabilityRate).toBeLessThan(100);
    expect(metrics.unlinkedEvidence).toBeGreaterThan(0);
  });
});

// ─── Report ────────────────────────────────────────────────────────

describe('report', () => {
  it('generateFullReport debe generar Markdown válido', () => {
    const data = createInitialData();
    const md = generateFullReport(data);
    expect(md).toContain('# Informe de Trazabilidad');
    expect(md).toContain('Resumen de Cumplimiento');
    expect(md).toContain('Estado de Pruebas');
    expect(md).toContain('Evidencias');
  });

  it('generateFullReport debe incluir activity log', () => {
    const data = createInitialData();
    const md = generateFullReport(data);
    expect(md).toContain('Registro de Actividad');
  });

  it('generateProjectReport debe generar reporte de un proyecto', () => {
    const data = createInitialData();
    const md = generateProjectReport(data.projects[0]);
    expect(md).toContain(data.projects[0].title);
    expect(md).toContain('Quality Gate');
  });

  it('generateFullReport debe incluir métricas', () => {
    const data = createInitialData();
    const md = generateFullReport(data);
    expect(md).toContain('Tasa de cumplimiento');
    expect(md).toContain('Tasa de trazabilidad');
  });
});
