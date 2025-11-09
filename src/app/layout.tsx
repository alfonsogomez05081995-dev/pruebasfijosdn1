
import type {Metadata} from 'next';
// Importa los estilos globales de la aplicación.
import './globals.css';
// Importa el componente Toaster para mostrar notificaciones (toasts).
import { Toaster } from "@/components/ui/toaster";
// Importa el proveedor de autenticación para dar acceso al contexto de autenticación a toda la app.
import { AuthProvider } from '../contexts/AuthContext';

/**
 * Metadatos de la aplicación.
 * Next.js utiliza este objeto para configurar las etiquetas <title> y <meta> en el <head> del HTML.
 */
export const metadata: Metadata = {
  title: 'FijosDN',
  description: 'Gestión de Activos Fijos',
};

/**
 * Componente RootLayout (Diseño Raíz).
 * Este es el diseño principal que envuelve a toda la aplicación.
 * @param {object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Los componentes hijos que serán renderizados dentro de este layout.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // La etiqueta <html> se configura con el idioma inglés y la clase 'dark' para el tema oscuro por defecto.
    <html lang="en" className="dark">
      <head>
        {/* Carga de la fuente 'Inter' desde Google Fonts para un diseño consistente. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      {/* El cuerpo de la página con clases de Tailwind CSS para la fuente, antialiasing y un fondo degradado. */}
      <body className="font-body antialiased bg-gradient-to-br from-[#F00A36] via-[#7B00A7] to-[#0047AB]">
        {/* Envuelve a todos los componentes hijos con el AuthProvider. */}
        {/* Esto asegura que cualquier componente en la aplicación pueda acceder al estado de autenticación. */}
        <AuthProvider>
            {children}
        </AuthProvider>
        {/* Renderiza el componente Toaster a nivel global para que las notificaciones puedan aparecer en cualquier página. */}
        <Toaster />
      </body>
    </html>
  );
}
