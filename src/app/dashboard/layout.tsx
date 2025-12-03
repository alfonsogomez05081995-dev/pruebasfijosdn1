'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Users,
  Wrench,
  PanelLeft,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserNav } from "@/components/user-nav";
import { Logo } from "@/components/logo";
import { useAuth } from '../../contexts/AuthContext'; 
import { cn } from "@/lib/utils";

const allNavItems = [
    { href: "/dashboard", label: "Inicio", icon: Home, roles: ['master', 'master_it', 'master_campo', 'master_depot', 'logistica', 'empleado'] },
    { href: "/dashboard/master", label: "Master", icon: Users, roles: ['master', 'master_it', 'master_campo', 'master_depot'] },
    { href: "/dashboard/logistica", label: "Logística", icon: Package, roles: ['master', 'logistica'] },
    { href: "/dashboard/stock", label: "Inventario", icon: Warehouse, roles: ['master', 'master_it', 'master_campo', 'master_depot', 'logistica'] },
    { href: "/dashboard/empleado", label: "Empleado", icon: Wrench, roles: ['master', 'empleado'] },
];

export default function DashboardLayout({
  children, 
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth(); 
  const pathname = usePathname(); 

  // Lógica actualizada para seleccionar la clase de DEGRADADO correcta según la sección actual (ruta)
  const getBackgroundClass = () => {
    if (pathname?.includes('/dashboard/master')) return 'bg-gradient-master theme-master';
    if (pathname?.includes('/dashboard/logistica')) return 'bg-gradient-logistica theme-logistica';
    if (pathname?.includes('/dashboard/empleado')) return 'bg-gradient-empleado theme-empleado';
    // Retorna el degradado completo por defecto para Inicio / Dashboard general
    return 'bg-gradient-full';
  };

  const bgClass = getBackgroundClass();

  const navItems = allNavItems.filter(item => auth && auth.userData && auth.userData.role && item.roles.includes(auth.userData.role));

  return (
    <div className={cn(
      "grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] transition-all duration-700 ease-in-out",
      "corporate-theme", // <--- ACTIVAMOS EL TEMA NUEVO SOLO AQUÍ
      bgClass 
    )}>
      {/* Sidebar con efecto de vidrio más limpio y bordes sutiles */}
      <div className="hidden border-r glass-sidebar md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b border-white/10 px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
              <Logo className="h-8 w-8 text-primary" />
              <span className="font-bold tracking-wide">FijosDN</span>
            </Link>
          </div>
          <div className="flex-1 py-2">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                    pathname === item.href 
                      ? "bg-white/90 text-primary shadow-md font-bold translate-x-1" // Item activo resaltado
                      : "text-muted-foreground hover:bg-white/20 hover:text-foreground hover:translate-x-1"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", pathname === item.href ? "text-primary" : "text-current")} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="flex flex-col relative">
        {/* Header flotante tipo vidrio */}
        <header className="flex h-14 items-center gap-4 border-b border-white/10 bg-white/30 backdrop-blur-md px-4 lg:h-[60px] lg:px-6 sticky top-0 z-50 shadow-sm">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden hover:bg-white/20"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-white/95 backdrop-blur-xl">
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
                    className={cn(
                      "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:bg-muted",
                       pathname === item.href ? "bg-muted text-primary" : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
          </div>
          <UserNav />
        </header>
        
        {/* Main content area */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-hidden">
          {/* Panel contenedor con efecto vidrio blanco limpio para que el contenido resalte sobre el fondo colorido */}
          <div className="glass-panel rounded-2xl h-full p-6 animate-in fade-in zoom-in-95 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
