import type {NextConfig} from 'next';

/**
 * @file Este archivo contiene la configuración para Next.js.
 * Permite personalizar el comportamiento del framework, como el manejo de TypeScript,
 * ESLint, imágenes, y más.
 */
const nextConfig: NextConfig = {
  /**
   * Configuración de TypeScript.
   */
  typescript: {
    // `ignoreBuildErrors: true` indica a Next.js que no falle la compilación (build)
    // si se encuentran errores de TypeScript. Esto puede ser útil para desplegar
    // rápidamente, pero debe usarse con precaución ya que oculta posibles problemas.
    ignoreBuildErrors: true,
  },

  /**
   * Configuración de ESLint.
   */
  eslint: {
    // `ignoreDuringBuilds: true` evita que ESLint se ejecute durante el proceso de
    // compilación. Esto acelera el build, asumiendo que el linting se realiza
    // por separado (ej. en un paso de CI/CD o localmente).
    ignoreDuringBuilds: true,
  },

  /**
   * Configuración del componente `next/image` para optimización de imágenes.
   */
  images: {
    // `remotePatterns` define una lista blanca de dominios externos desde los cuales
    // se permite cargar y optimizar imágenes. Es una medida de seguridad para
    // prevenir el uso de dominios maliciosos.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co', // Permite imágenes del servicio de placeholders 'placehold.co'.
        port: '',
        pathname: '/**', // Permite cualquier ruta dentro de ese dominio.
      },
      // Aquí se podrían agregar otros dominios, como el de Firebase Storage.
      // {
      //   protocol: 'https',
      //   hostname: 'firebasestorage.googleapis.com',
      //   port: '',
      //   pathname: '/v0/b/your-project-id.appspot.com/**',
      // }
    ],
  },
};

export default nextConfig;
