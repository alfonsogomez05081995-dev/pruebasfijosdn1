/**
 * @file Este archivo configura PostCSS.
 * PostCSS es una herramienta para transformar CSS con plugins de JavaScript.
 * En el contexto de un proyecto con Tailwind CSS, se utiliza principalmente para
 * procesar las directivas de Tailwind (como `@tailwind base;`) y las clases de utilidad,
 * convirtiéndolas en CSS estándar que los navegadores pueden entender.
 *
 * @type {import('postcss-load-config').Config}
 */
const config = {
  /**
   * `plugins` es un objeto donde se especifican los plugins de PostCSS que se van a utilizar.
   */
  plugins: {
    /**
     * `tailwindcss: {}` registra el plugin de Tailwind CSS.
     * El objeto vacío `{}` indica que se utilizará la configuración por defecto del plugin,
     * la cual buscará automáticamente el archivo `tailwind.config.js` (o similar) en la raíz del proyecto.
     */
    tailwindcss: {},
    // En configuraciones más avanzadas, aquí se podría añadir `autoprefixer` para
    // agregar automáticamente prefijos de proveedor (-webkit-, -moz-, etc.) al CSS.
    // 'autoprefixer': {},
  },
};

export default config;
