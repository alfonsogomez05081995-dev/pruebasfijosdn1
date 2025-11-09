import { clsx, type ClassValue } from "clsx"
import { Timestamp } from "firebase/firestore";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
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
  return timestamp.toDate().toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
