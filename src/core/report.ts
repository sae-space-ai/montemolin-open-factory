/**
 * Reportes — Generación de informes Markdown
 *
 * Genera informes de trazabilidad y cumplimiento en formato Markdown.
 * Útil para exportar el estado del sistema como documentación.
 */

import type { AppData, Project } from './types';
import { evaluateQualityGate, gateMessage } from './quality-gate';
import { calculateComplianceMetrics } from './compliance';
import { formatDate } from './utils';

/**
 * Genera un informe completo del sistema en Markdown.
 */
export function generateFullReport(data: AppData): string {
  const metrics = calculateComplianceMetrics(data);
  const now = new Date().toISOString();

  let md = `# Informe de Trazabilidad — Montemolín Open Factory\n\n`;
  md += `**Generado:** ${formatDate(now)}\n\n`;
  md += `---\n\n`;

  // Métricas generales
  md += `## Resumen de Cumplimiento\n\n`;
  md += `| Métrica | Valor |\n`;
  md += `|---------|-------|\n`;
  md += `| Proyectos totales | ${metrics.totalProjects} |\n`;
  md += `| Proyectos completados | ${metrics.completedProjects} |\n`;
  md += `| Proyectos bloqueados | ${metrics.blockedProjects} |\n`;
  md += `| Tasa de cumplimiento | ${metrics.complianceRate}% |\n`;
  md += `| Tasa de trazabilidad | ${metrics.traceabilityRate}% |\n\n`;

  // Pruebas
  md += `## Estado de Pruebas\n\n`;
  md += `| Estado | Cantidad |\n`;
  md += `|--------|----------|\n`;
  md += `| Pasadas | ${metrics.passedTests} |\n`;
  md += `| Fallidas | ${metrics.failedTests} |\n`;
  md += `| Pendientes | ${metrics.pendingTests} |\n`;
  md += `| **Obligatorias** | ${metrics.mandatoryTests} |\n`;
  md += `| Obligatorias pasadas | ${metrics.mandatoryPassed} |\n`;
  md += `| Obligatorias fallidas | ${metrics.mandatoryFailed} |\n\n`;

  // Evidencias
  md += `## Evidencias\n\n`;
  md += `| Estado | Cantidad |\n`;
  md += `|--------|----------|\n`;
  md += `| Totales | ${metrics.totalEvidence} |\n`;
  md += `| Verificadas | ${metrics.verifiedEvidence} |\n`;
  md += `| Bloqueadas | ${metrics.blockedEvidence} |\n`;
  md += `| Sin vincular | ${metrics.unlinkedEvidence} |\n\n`;

  // Tareas
  md += `## Tareas\n\n`;
  md += `- Total: ${metrics.totalTasks}\n`;
  md += `- Completadas: ${metrics.completedTasks}\n`;
  md += `- Pendientes: ${metrics.totalTasks - metrics.completedTasks}\n\n`;

  md += `---\n\n`;

  // Detalle por proyecto
  md += `## Detalle por Proyecto\n\n`;
  for (const project of data.projects) {
    md += generateProjectReport(project);
    md += `\n---\n\n`;
  }

  // Activity Log
  if (data.activityLog && data.activityLog.entries.length > 0) {
    md += `## Registro de Actividad (últimas 20)\n\n`;
    md += `| Fecha | Acción | Proyecto | Detalle |\n`;
    md += `|-------|--------|----------|--------|\n`;
    const recent = data.activityLog.entries.slice(0, 20);
    for (const entry of recent) {
      md += `| ${formatDate(entry.timestamp)} | ${entry.action} | ${entry.projectName} | ${entry.detail} |\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;
  md += `*Informe generado automáticamente por Montemolín Open Factory*\n`;

  return md;
}

/**
 * Genera un informe de un proyecto específico.
 */
export function generateProjectReport(project: Project): string {
  const gate = evaluateQualityGate(project);

  let md = `### ${project.title}\n\n`;
  md += `- **Revisión:** ${project.revision}\n`;
  md += `- **Estado:** ${project.status}\n`;
  md += `- **Quality Gate:** ${gate.canApprove ? '✅ APROBADO' : '🔴 BLOQUEADO'}\n`;
  md += `- **Mensaje:** ${gateMessage(gate)}\n\n`;

  md += `**Descripción:** ${project.description}\n\n`;

  // Tareas
  if (project.tasks.length > 0) {
    md += `#### Tareas (${project.tasks.filter((t) => t.completed).length}/${project.tasks.length})\n\n`;
    for (const task of project.tasks) {
      md += `- [${task.completed ? 'x' : ' '}] ${task.title}\n`;
    }
    md += `\n`;
  }

  // Pruebas
  if (project.tests.length > 0) {
    md += `#### Pruebas\n\n`;
    md += `| Nombre | Tipo | Estado |\n`;
    md += `|--------|------|--------|\n`;
    for (const test of project.tests) {
      const type = test.mandatory ? 'OBL' : 'OPT';
      const status = test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⏳';
      md += `| ${test.name} | ${type} | ${status} ${test.status} |\n`;
    }
    md += `\n`;
  }

  // Evidencias
  if (project.evidence.length > 0) {
    md += `#### Evidencias\n\n`;
    for (const ev of project.evidence) {
      const status = ev.verified ? '✅' : ev.blocked ? '⛔' : '⏳';
      const linked = ev.linkedTaskId
        ? `→ Tarea vinculada`
        : '→ Sin vincular';
      md += `- ${status} ${ev.description} (${formatDate(ev.date)}) ${linked}\n`;
    }
    md += `\n`;
  }

  return md;
}

/**
 * Descarga el informe como archivo Markdown.
 */
export function downloadReport(data: AppData): void {
  const md = generateFullReport(data);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `montemolin-informe-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
