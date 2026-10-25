/**
 * Persistencia — capa de almacenamiento.
 *
 * Aísla el acceso a localStorage del resto del sistema.
 * Si mañana cambiamos a IndexedDB o a un backend, solo se modifica este archivo.
 */

import type { AppData } from './types';

const STORAGE_KEY = 'montemolin-open-factory-v2';

export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    // Validación mínima de estructura
    if (!parsed.projects || !Array.isArray(parsed.projects)) {
      console.warn('[storage] Datos corruptos, se ignoran.');
      return null;
    }
    // Migración Fase 3: asegurar activityLog
    if (!parsed.activityLog) {
      parsed.activityLog = { entries: [] };
    }
    // Migración Fase 3: asegurar linkedTaskId en evidencias
    parsed.projects = parsed.projects.map((p) => ({
      ...p,
      evidence: (p.evidence || []).map((e) => ({
        ...e,
        linkedTaskId: e.linkedTaskId ?? null,
      })),
    }));
    return parsed;
  } catch (e) {
    console.error('[storage] Error al cargar datos:', e);
    return null;
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('[storage] Error al guardar datos:', e);
    return false;
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[storage] Error al limpiar datos:', e);
  }
}

/** Exporta los datos como JSON descargable. */
export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `montemolin-open-factory-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Importa datos desde un archivo JSON. Retorna null si falla. */
export function importDataFromFile(file: File): Promise<AppData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as AppData;
        if (!parsed.projects || !Array.isArray(parsed.projects)) {
          resolve(null);
          return;
        }
        resolve(parsed);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
