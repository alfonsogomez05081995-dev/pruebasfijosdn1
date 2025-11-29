'use client';

// Importa el componente Link de Next.js para la navegación.
import Link from "next/link";
// Importa iconos de la biblioteca lucide-react.
import { ArrowRight, Users, Package, Wrench } from "lucide-react";
// Importa componentes de UI personalizados.
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Importa el hook useAuth para acceder a la información de autenticación.
import { useAuth } from '@/contexts/AuthContext'; // Importación corregida
// Importa el hook useRouter de Next.js para la navegación programática.
import { useRouter } from "next/navigation";
// Importa el hook useEffect de React para manejar efectos secundarios.
import { useEffect } from "react";

// Define todos los roles disponibles en la aplicación con su información.
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

// Define el componente principal del dashboard.
export default function Dashboard() {
  // Obtiene el estado de autenticación.
  const auth = useAuth();
  // Obtiene el objeto router para la navegación.
  const router = useRouter();

  // Efecto que redirige al inicio si el usuario no está autenticado.
  useEffect(() => {
    if (auth && !auth.loading && !auth.currentUser) {
      router.push('/');
    }
  }, [auth, router]);

  // Muestra un mensaje de carga mientras se verifica la autenticación.
  if (!auth || auth.loading || !auth.currentUser) {
    return <div>Cargando...</div>;
  }

  // Obtiene el rol del usuario autenticado.
  const { userRole } = auth;
  // Filtra los roles disponibles según el rol del usuario.
  const availableRoles = allRoles.filter(role => userRole && role.roles.includes(userRole));

  // Renderiza la interfaz del dashboard.
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          Bienvenido a FijosDN
        </h1>
        <p className="max-w-[600px] text-muted-foreground md:text-xl mx-auto">
          Su solución integral para la gestión de activos fijos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 md:gap-8 w-full max-w-5xl">
        {/* Mapea los roles disponibles y renderiza una tarjeta para cada uno. */}
        {availableRoles.map((role) => (
          <Card key={role.name} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <role.icon className="h-8 w-8 text-primary" />
                <CardTitle>{role.name}</CardTitle>
              </div>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow"></CardContent>
            <div className="p-6 pt-0 mt-auto">
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
