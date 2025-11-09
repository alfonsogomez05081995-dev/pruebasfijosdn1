// Importa el hook 'use client' para indicar que este es un componente de cliente en Next.js.
"use client";

// Importaciones de componentes y utilidades necesarios.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, LogOut, User } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext'; // Hook para acceder al contexto de autenticación.

// Define el componente funcional UserNav.
export function UserNav() {
  // Obtiene el estado y las funciones de autenticación usando el hook useAuth.
  const auth = useAuth();
  // Hook de Next.js para la navegación programática.
  const router = useRouter();

  // Si el contexto de autenticación no está disponible o no hay datos de usuario, no renderiza nada.
  if (!auth || !auth.userData) {
    return null;
  }

  // Desestructura los datos del usuario y la función de cierre de sesión del contexto de autenticación.
  const { userData, logout } = auth;

  // Función para manejar el cierre de sesión.
  const handleLogout = async () => {
    try {
      // Llama a la función de cierre de sesión del contexto.
      await logout();
      // Redirige al usuario a la página de inicio.
      router.push('/');
    } catch (error) {
      // Muestra un error en la consola si el cierre de sesión falla.
      console.error("Failed to log out:", error);
    }
  };

  // Función para obtener la inicial del nombre del usuario.
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '';
  }

  // Renderiza el menú de navegación del usuario.
  return (
    <DropdownMenu>
      {/* El disparador del menú desplegable es un botón con el avatar del usuario. */}
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {/* Muestra la imagen del avatar del usuario. */}
            <AvatarImage src="https://placehold.co/100x100.png" alt="@user" />
            {/* Fallback en caso de que la imagen no cargue, muestra la inicial del nombre. */}
            <AvatarFallback>{getInitials(userData.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      {/* Contenido del menú desplegable. */}
      <DropdownMenuContent className="w-56" align="end" forceMount>
        {/* Etiqueta que muestra el nombre y el correo electrónico del usuario. */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userData.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userData.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* Grupo de ítems del menú. */}
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Paz y Salvo</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Ítem para cerrar sesión, con un manejador de clic. */}
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}