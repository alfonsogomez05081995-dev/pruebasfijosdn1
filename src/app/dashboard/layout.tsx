'use client';

// Importa el componente Link de Next.js para la navegación entre páginas.
import Link from "next/link";
// Importa iconos de la biblioteca lucide-react para usarlos en la interfaz.
import {
  Home,
  Package,
  Users,
  Wrench,
  PanelLeft,
  Warehouse, // Añadido para Inventario
} from "lucide-react";
// Importa componentes de UI personalizados.
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserNav } from "@/components/user-nav";
import { Logo } from "@/components/logo";
// Importa el hook useAuth para acceder a la información de autenticación del usuario.
import { useAuth } from '../../contexts/AuthContext'; // Importación corregida

// Define todos los elementos de navegación disponibles en la aplicación.
const allNavItems = [
    { href: "/dashboard", label: "Inicio", icon: Home, roles: ['master', 'master_it', 'master_campo', 'master_depot', 'logistica', 'empleado'] },
    { href: "/dashboard/master", label: "Master", icon: Users, roles: ['master', 'master_it', 'master_campo', 'master_depot'] },
    { href: "/dashboard/logistica", label: "Logística", icon: Package, roles: ['master', 'logistica'] },
    { href: "/dashboard/stock", label: "Inventario", icon: Warehouse, roles: ['master', 'master_it', 'master_campo', 'master_depot', 'logistica'] },
    { href: "/dashboard/empleado", label: "Empleado", icon: Wrench, roles: ['master', 'empleado'] },
];

// Define el componente DashboardLayout que envuelve el contenido de las páginas del dashboard.
export default function DashboardLayout({
  children, // Prop que recibe el contenido a renderizar dentro del layout.
}: {
  children: React.ReactNode;
}) {
  // Obtiene el estado de autenticación usando el hook useAuth.
  const auth = useAuth(); 

  // Filtra los elementos de navegación para mostrar solo aquellos permitidos para el rol del usuario actual.
  const navItems = allNavItems.filter(item => auth && auth.userData && auth.userData.role && item.roles.includes(auth.userData.role));

  // Renderiza la estructura del layout.
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Barra lateral de navegación para pantallas medianas y grandes (md y lg). */}
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo className="h-8 w-8" />
              <span className="">FijosDN</span>
            </Link>
          </div>
          <div className="flex-1">
            {/* Menú de navegación principal. */}
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
      {/* Contenido principal y cabecera. */}
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
                <span className="sr-only">Toggle navigation menu</span>
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
            {/* Espacio para futuras adiciones como breadcrumbs o una barra de búsqueda. */}
          </div>
          {/* Componente que muestra la información del usuario y opciones de sesión. */}
          <UserNav />
        </header>
        {/* Contenido principal de la página. */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background/80">
          {children}
        </main>
      </div>
    </div>
  );
}
