/**
 * Búsqueda global — búsqueda en todo el sistema
 *
 * Permite buscar en proyectos, tareas, evidencias y pruebas.
 * Retorna resultados ordenados por relevancia.
 */

import type { AppData, SearchResult, Id } from './types';

/**
 * Busca en todo el sistema.
 * La búsqueda es case-insensitive y busca en títulos y descripciones.
 */
export function searchAll(data: AppData, query: string): SearchResult[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  for (const project of data.projects) {
    // Buscar en proyecto
    if (
      project.title.toLowerCase().includes(q) ||
      project.description.toLowerCase().includes(q)
    ) {
      results.push({
        type: 'project',
        projectId: project.id,
        projectName: project.title,
        itemId: project.id,
        title: project.title,
        subtitle: project.description,
        matched: true,
      });
    }

    // Buscar en tareas
    for (const task of project.tasks) {
      if (task.title.toLowerCase().includes(q)) {
        results.push({
          type: 'task',
          projectId: project.id,
          projectName: project.title,
          itemId: task.id,
          title: task.title,
          subtitle: `Tarea en ${project.title}`,
          matched: true,
        });
      }
    }

    // Buscar en evidencias
    for (const ev of project.evidence) {
      if (ev.description.toLowerCase().includes(q)) {
        results.push({
          type: 'evidence',
          projectId: project.id,
          projectName: project.title,
          itemId: ev.id,
          title: ev.description,
          subtitle: `Evidencia en ${project.title}${ev.verified ? ' ✓' : ev.blocked ? ' ⛔' : ''}`,
          matched: true,
        });
      }
    }

    // Buscar en pruebas
    for (const test of project.tests) {
      if (test.name.toLowerCase().includes(q)) {
        results.push({
          type: 'test',
          projectId: project.id,
          projectName: project.title,
          itemId: test.id,
          title: test.name,
          subtitle: `Prueba en ${project.title} ${test.mandatory ? '(OBL)' : '(OPT)'}`,
          matched: true,
        });
      }
    }
  }

  // Ordenar: proyectos primero, luego por orden alfabético
  return results.sort((a, b) => {
    const typeOrder = { project: 0, task: 1, evidence: 2, test: 3 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return a.title.localeCompare(b.title);
  });
}

/**
 * Busca solo en un proyecto específico.
 */
export function searchInProject(
  data: AppData,
  projectId: Id,
  query: string
): SearchResult[] {
  if (!query.trim()) return [];

  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  // Buscar en tareas
  for (const task of project.tasks) {
    if (task.title.toLowerCase().includes(q)) {
      results.push({
        type: 'task',
        projectId: project.id,
        projectName: project.title,
        itemId: task.id,
        title: task.title,
        subtitle: 'Tarea',
        matched: true,
      });
    }
  }

  // Buscar en evidencias
  for (const ev of project.evidence) {
    if (ev.description.toLowerCase().includes(q)) {
      results.push({
        type: 'evidence',
        projectId: project.id,
        projectName: project.title,
        itemId: ev.id,
        title: ev.description,
        subtitle: `Evidencia${ev.verified ? ' ✓' : ev.blocked ? ' ⛔' : ''}`,
        matched: true,
      });
    }
  }

  // Buscar en pruebas
  for (const test of project.tests) {
    if (test.name.toLowerCase().includes(q)) {
      results.push({
        type: 'test',
        projectId: project.id,
        projectName: project.title,
        itemId: test.id,
        title: test.name,
        subtitle: `Prueba ${test.mandatory ? '(OBL)' : '(OPT)'}`,
        matched: true,
      });
    }
  }

  return results;
}
