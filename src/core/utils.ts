/**
 * Utilidades puras — sin dependencias de DOM ni estado.
 */

/** Genera un identificador alfanumérico corto. */
export function generateId(): string {
  // Usar crypto.randomUUID si está disponible, sino fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: combinación de timestamp y random
  return Math.random().toString(36).substring(2, 11) +
    Date.now().toString(36).slice(-4);
}

/** Devuelve la fecha actual en formato ISO. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Formatea una fecha ISO para mostrar en español. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
