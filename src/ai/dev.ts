/**
 * @file Este archivo es el punto de entrada para los flujos de Genkit en el entorno de desarrollo.
 *
 * Cuando se ejecuta la UI de desarrollo de Genkit (`genkit start`), este archivo es
 * procesado para descubrir y registrar todos los flujos de IA (flows) definidos.
 *
 * Para que un flujo sea visible en la UI de desarrollo, el archivo donde se define
 * debe ser importado aquí. La importación se hace por su "efecto secundario" (side effect)
 * de registrar el flujo en la instancia global de Genkit.
 *
 * @example
 * // Si tienes un flujo definido en './myFlow.ts', lo importarías así:
 * import './myFlow';
 *
 * // Actualmente, este archivo está vacío porque no se han implementado flujos de IA.
 */

// Los flujos se importarán por sus efectos secundarios en este archivo.
