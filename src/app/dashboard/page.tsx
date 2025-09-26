'use client';

import Link from "next/link";
import { ArrowRight, Users, Package, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext'; // Correct import
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const allRoles = [
    {
      name: "Master",
      description: "Asigne activos y autorice reposiciones.",
      icon: Users,
      href: "/dashboard/master",
      roles: ['master']
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

export default function Dashboard() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth && !auth.loading && !auth.currentUser) {
      router.push('/');
    }
  }, [auth, router]);

  if (!auth || auth.loading || !auth.currentUser) {
    return <div>Cargando...</div>;
  }

  const { userRole } = auth;
  const availableRoles = allRoles.filter(role => userRole && role.roles.includes(userRole));

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