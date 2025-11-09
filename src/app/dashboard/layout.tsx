'use client';

// Importa el componente Link de Next.js para la navegación sin recargar la página.
import Link from "next/link";
// Importa iconos de la biblioteca lucide-react para usarlos en la interfaz.
import {
  Home,
  Package,
  Users,
  Wrench,
  PanelLeft,
  Warehouse,
} from "lucide-react";
// Importa componentes de UI personalizados de Shadcn UI.
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
// Importa componentes personalizados de la aplicación.
import { UserNav } from "@/components/user-nav"; // Menú de usuario (avatar, nombre, cerrar sesión).
import { Logo } from "@/components/logo";
// Importa el hook useAuth para acceder a la información y el rol del usuario autenticado.
import { useAuth } from '../../contexts/AuthContext';

/**
 * Define todos los elementos de navegación disponibles en la aplicación.
 * Cada objeto contiene la ruta, la etiqueta, el icono y un array de 'roles' que tienen permiso para ver el enlace.
 * Esta es la configuración central para el Control de Acceso Basado en Roles (RBAC) en la navegación.
 */
const allNavItems = [
    { href: "/dashboard", label: "Inicio", icon: Home, roles: ['master', 'master_it', 'master_campo', 'master_depot', 'logistica', 'empleado'] },
    { href: "/dashboard/master", label: "Master", icon: Users, roles: ['master', 'master_it', 'master_campo', 'master_depot'] },
    { href: "/dashboard/logistica", label: "Logística", icon: Package, roles: ['master', 'logistica'] },
    { href: "/dashboard/stock", label: "Inventario", icon: Warehouse, roles: ['master', 'master_it', 'master_campo', 'master_depot', 'logistica'] },
    { href: "/dashboard/empleado", label: "Empleado", icon: Wrench, roles: ['master', 'empleado'] },
];

/**
 * Componente DashboardLayout.
 * Este es el diseño principal para todas las páginas dentro del área del dashboard.
 * Proporciona una estructura consistente con una barra de navegación lateral y una cabecera.
 * @param {object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - El contenido de la página específica que se renderizará.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Obtiene el estado de autenticación (incluyendo los datos y el rol del usuario) usando el hook useAuth.
  const auth = useAuth(); 

  /**
   * Filtra los elementos de navegación (`allNavItems`) para mostrar solo aquellos
   * que el rol del usuario actual (`auth.userData.role`) tiene permitido ver.
   * Esta es la implementación clave de la navegación dinámica basada en roles.
   */
  const navItems = allNavItems.filter(item => auth?.userData?.role && item.roles.includes(auth.userData.role));

  // Renderiza la estructura del layout.
  return (
    // Layout de dos columnas para pantallas de escritorio.
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* --- Barra lateral de navegación (visible en pantallas de escritorio) --- */}
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo className="h-8 w-8" />
              <span className="">FijosDN</span>
            </Link>
          </div>
          <div className="flex-1">
            {/* Menú de navegación principal renderizado dinámicamente. */}
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      {/* --- Contenido principal y cabecera --- */}
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          {/* Menú de navegación deslizable para pantallas pequeñas (móviles). */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Abrir menú de navegación</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
               <SheetHeader>
                <SheetTitle>
                   <Link
                    href="#"
                    className="flex items-center gap-2 text-lg font-semibold"
                  >
                    <Logo className="h-8 w-8" />
                    <span>FijosDN</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              {/* Navegación dentro del menú deslizable. */}
              <nav className="grid gap-2 text-lg font-medium mt-4">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Espacio vacío en la cabecera, útil para futuras adiciones como breadcrumbs. */}
          </div>
          {/* Componente que muestra el avatar del usuario y el menú para cerrar sesión. */}
          <UserNav />
        </header>
        {/* El contenido principal de la página se renderiza aquí. */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background/80">
          {children}
        </main>
      </div>
    </div>
  );
}
