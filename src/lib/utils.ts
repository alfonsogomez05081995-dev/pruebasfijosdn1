import { clsx, type ClassValue } from "clsx"
import { Timestamp } from "firebase/firestore";
import { twMerge } from "tailwind-merge"

/**
 * Función de utilidad para combinar nombres de clases de CSS de forma inteligente.
 * Es especialmente útil en proyectos con Tailwind CSS para manejar clases condicionales
 * y resolver conflictos de clases de utilidad.
 *
 * @param {...ClassValue[]} inputs - Una secuencia de nombres de clase. Pueden ser strings,
 *   objetos (para clases condicionales), o arrays.
 * @returns {string} Una cadena de nombres de clase optimizada y sin conflictos.
 *
 * @example
 * // cn("p-4", "bg-red-500", { "font-bold": true }); => "p-4 bg-red-500 font-bold"
 * // cn("p-4 bg-red-500", "p-8"); => "p-8 bg-red-500" (tailwind-merge resuelve el conflicto de padding)
 */
export function cn(...inputs: ClassValue[]) {
  // 1. `clsx` procesa los inputs para manejar clases condicionales.
  // 2. `twMerge` toma la cadena resultante y resuelve conflictos de clases de Tailwind.
  return twMerge(clsx(inputs))
}

/**
 * Formatea un objeto Timestamp de Firebase a una cadena de fecha y hora legible.
 * @param timestamp - El objeto Timestamp de Firebase.
 * @returns Una cadena con la fecha y hora formateadas (ej: "15 de julio de 2024, 10:30 AM") o una cadena vacía si el timestamp no es válido.
 */
export function formatFirebaseTimestamp(timestamp: Timestamp | undefined): string {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return '';
  }
  // Usa toLocaleString para formatear la fecha según la configuración regional de Colombia (es-CO).
  return timestamp.toDate().toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
