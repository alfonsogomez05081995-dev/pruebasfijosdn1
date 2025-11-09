'use client';
// Importaciones de hooks y componentes de Next.js y React.
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

// Importaciones de componentes de UI personalizados (probablemente de Shadcn UI).
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';

// Importaciones de hooks y contextos personalizados de la aplicación.
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * Componente LoginPage.
 * Esta es la página principal de la aplicación, que funciona como la pantalla de inicio de sesión.
 */
export default function LoginPage() {
  // --- Hooks y Estados ---
  const router = useRouter(); // Hook de Next.js para la navegación programática.
  const auth = useAuth(); // Hook personalizado para acceder al contexto de autenticación.
  const { toast } = useToast(); // Hook para mostrar notificaciones (toasts).
  
  // Estados para manejar los campos del formulario.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Estado para controlar la interfaz durante la carga (ej. deshabilitar el botón).
  const [loading, setLoading] = useState(false);

  /**
   * Maneja el envío del formulario de inicio de sesión.
   * @param {React.FormEvent} e - El evento del formulario.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Previene el comportamiento por defecto del formulario (recargar la página).
    if (!auth) return; // Guarda de seguridad por si el contexto no está disponible.

    setLoading(true); // Inicia el estado de carga.
    try {
      // Llama a la función de login del contexto de autenticación.
      await auth.login(email, password);
      // Si el login es exitoso, redirige al usuario al dashboard.
      router.push('/dashboard');
    } catch (error: any) {
      // Si ocurre un error, muestra una notificación descriptiva.
      toast({
          variant: "destructive",
          title: "Error de Autenticación",
          description: error.message, // Muestra el mensaje de error de Firebase.
      })
    }
    setLoading(false); // Finaliza el estado de carga.
  };

  // --- Renderizado del Componente ---
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* El componente Card actúa como el contenedor principal del formulario. */}
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
        <form onSubmit={handleLogin}>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Logo />
              </div>
              <CardTitle className="text-3xl font-bold">FijosDN</CardTitle>
              <CardDescription>Gestión de Activos Fijos. Ingrese a su cuenta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Campo para el correo electrónico */}
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="usuario@empresa.com" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
              {/* Campo para la contraseña */}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Ingresa tu contraseña" 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              {/* Botón de envío del formulario */}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </CardFooter>
        </form>
        {/* Enlace a la página de registro para nuevos usuarios */}
        <div className="pb-4 text-center text-sm">
          ¿No tienes una cuenta?{" "}
          <Link href="/signup" className="underline">
            Regístrate
          </Link>
        </div>
      </Card>
    </main>
  );
}