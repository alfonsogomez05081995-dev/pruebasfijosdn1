import type {Config} from 'tailwindcss';

/**
 * @file Este archivo contiene la configuración de Tailwind CSS.
 * Permite definir y personalizar el sistema de diseño de la aplicación,
 * incluyendo la paleta de colores, tipografías, espaciados, y más.
 * Esta configuración está adaptada para un sistema de temas (theming) usando variables CSS,
 * un patrón común en proyectos con Shadcn UI.
 */
export default {
  /**
   * `darkMode: ['class']` habilita el modo oscuro basado en una clase CSS.
   * Cuando el elemento `<html>` tiene la clase `.dark`, se aplican los estilos de modo oscuro.
   */
  darkMode: ['class'],

  /**
   * `content` le dice a Tailwind qué archivos debe escanear para encontrar
   * las clases de utilidad que se están usando. Esto permite a Tailwind purgar
   * las clases no utilizadas en el build de producción, optimizando el tamaño del CSS.
   */
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  /**
   * `theme` es donde se define la paleta de diseño.
   * `extend` permite añadir nuevas utilidades o modificar las existentes sin sobreescribirlas.
   */
  theme: {
    extend: {
      /**
       * Define familias de fuentes personalizadas.
       */
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['monospace'],
      },

      /**
       * Define la paleta de colores.
       * El uso de `hsl(var(--variable-css))` permite que los colores sean temáticos.
       * Los valores reales de HSL se definen en un archivo CSS global (ej. `globals.css`),
       * permitiendo cambiar el tema (ej. de claro a oscuro) simplemente cambiando las variables CSS.
       */
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ... (otras definiciones de colores temáticos)
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ...
      },

      /**
       * Personaliza los radios de borde, también usando una variable CSS para consistencia.
       */
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      /**
       * Define animaciones personalizadas usando `@keyframes`.
       */
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },

      /**
       * Asocia los keyframes definidos con clases de utilidad de animación.
       */
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },

  /**
   * `plugins` permite extender Tailwind con funcionalidades adicionales.
   * `tailwindcss-animate` es un plugin comúnmente usado con Shadcn UI para
   * añadir clases de utilidad para las animaciones definidas.
   */
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
