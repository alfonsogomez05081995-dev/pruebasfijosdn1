/**
 * @file Este archivo configura e inicializa el framework de Genkit AI para la aplicación.
 * Es el punto de entrada para definir los plugins, modelos y otras configuraciones
 * relacionadas con la inteligencia artificial.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

/**
 * Exporta la instancia configurada de Genkit.
 * Esta instancia se puede importar en otras partes de la aplicación para definir
 * flujos de IA (flows), acciones y otras funcionalidades de Genkit.
 */
export const ai = genkit({
  // `plugins` es un array donde se cargan los proveedores de modelos de IA.
  // En este caso, se utiliza el plugin de Google AI para acceder a los modelos de Gemini.
  plugins: [googleAI()],

  // `model` especifica el modelo de IA por defecto que se usará en los flujos,
  // a menos que se especifique otro modelo explícitamente.
  // 'googleai/gemini-1.5-flash' es un modelo rápido y eficiente de Google.
  model: 'googleai/gemini-1.5-flash',
});
