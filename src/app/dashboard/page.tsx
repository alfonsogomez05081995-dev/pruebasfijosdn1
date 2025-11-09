'use client';

// Importaciones de React y Next.js
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Importaciones de iconos y componentes de UI
import { ArrowRight, Users, Package, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Importación del hook de autenticación
import { useAuth } from '@/contexts/AuthContext';

/**
 * Define los módulos o "roles" principales de la aplicación que se mostrarán en el dashboard.
 * Cada objeto contiene el nombre, descripción, icono, ruta y los roles de usuario que pueden verlo.
 * Esto centraliza la configuración de los paneles principales.
 */
const allRoles = [
    {
      name: "Master",
      description: "Asigne activos y autorice reposiciones.",
      icon: Users,
      href: "/dashboard/master",
      roles: ['master', 'master_it', 'master_campo', 'master_depot']
    },
    {
      name: "Logística",
      description: "Ingrese y gestione el inventario de activos.",
      icon: Package,
      href: "/dashboard/logistica",
      roles: ['master', 'logistica']
    },
    {
      name: "Empleado",
      description: "Gestione sus activos asignados.",
      icon: Wrench,
      href: "/dashboard/empleado",
      roles: ['master', 'empleado']
    },
];

/**
 * Componente Dashboard.
 * Es la página de inicio para los usuarios autenticados. Muestra una bienvenida
 * y tarjetas de acceso a los diferentes módulos según el rol del usuario.
 */
export default function Dashboard() {
  // --- Hooks ---
  const auth = useAuth();
  const router = useRouter();

  /**
   * Efecto para depuración.
   * Muestra en consola el ID del proyecto de Firebase para verificar que las variables de entorno
   * se están cargando correctamente en el lado del cliente.
   * Debería eliminarse o desactivarse en producción.
   */
  useEffect(() => {
    console.log("DEBUG: Project ID from env is:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  }, []);

  /**
   * Efecto para proteger la ruta.
   * Si el estado de autenticación ha cargado y no hay un usuario,
   * redirige a la página de inicio de sesión.
   */
  useEffect(() => {
    if (auth && !auth.loading && !auth.currentUser) {
      router.push('/');
    }
  }, [auth, router]);

  // Muestra un mensaje de "Cargando..." mientras el contexto de autenticación determina el estado del usuario.
  if (!auth || auth.loading || !auth.currentUser) {
    return <div>Cargando...</div>;
  }

  // Obtiene el rol del usuario desde el contexto de autenticación.
  const { userRole } = auth;
  
  /**
   * Filtra los módulos (`allRoles`) para obtener solo aquellos que el usuario actual
   * tiene permiso para ver, basándose en su `userRole`.
   */
  const availableRoles = allRoles.filter(role => userRole && role.roles.includes(userRole));

  // --- Renderizado del Componente ---
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      {/* Sección de bienvenida */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          Bienvenido a FijosDN
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl mx-auto">
          Su solución integral para la gestión de activos fijos.
        </p>
      </div>

      {/* Grid que contiene las tarjetas de los módulos disponibles */}
      <div className="grid gap-6 md:grid-cols-3 md:gap-8 w-full max-w-5xl">
        {/* Mapea los módulos filtrados y renderiza una tarjeta para cada uno. */}
        {availableRoles.map((role) => (
          <Card key={role.name} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <role.icon className="h-8 w-8 text-primary" />
                <CardTitle>{role.name}</CardTitle>
              </div>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">{/* Espacio para crecer si es necesario */}</CardContent>
            <div className="p-6 pt-0 mt-auto">
                {/* Botón que lleva al panel correspondiente. */}
                <Button asChild className="w-full">
                  <Link href={role.href}>
                    Ir al panel <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
