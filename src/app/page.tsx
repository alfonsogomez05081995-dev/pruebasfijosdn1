// Indica que este componente se ejecuta en el lado del cliente.
'use client';
// Importa el hook useRouter de Next.js para la navegación.
import { useRouter } from 'next/navigation';
// Importa el componente Link de Next.js para la navegación entre páginas.
import Link from 'next/link';
// Importa el componente Button.
import { Button } from '@/components/ui/button';
// Importa los componentes de Card para la estructura de la interfaz.
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
// Importa el componente Input para los campos de entrada.
import { Input } from '@/components/ui/input';
// Importa el componente Label para las etiquetas de los campos de entrada.
import { Label } from '@/components/ui/label';
// Importa el componente Logo.
import { Logo } from '@/components/logo';
// Importa el hook useAuth del contexto de autenticación.
import { useAuth } from '@/contexts/AuthContext';
// Importa el hook useState de React para manejar el estado del componente.
import { useState } from 'react';
// Importa el hook useToast para mostrar notificaciones.
import { useToast } from '@/hooks/use-toast';

// Define el componente de la página de inicio de sesión.
export default function LoginPage() {
  // Inicializa el router para la navegación.
  const router = useRouter();
  // Obtiene el contexto de autenticación.
  const auth = useAuth();
  // Obtiene la función toast para mostrar notificaciones.
  const { toast } = useToast();
  // Define el estado para el correo electrónico.
  const [email, setEmail] = useState('');
  // Define el estado para la contraseña.
  const [password, setPassword] = useState('');
  // Define el estado para la carga.
  const [loading, setLoading] = useState(false);

  // Maneja el evento de inicio de sesión.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      // Llama a la función de inicio de sesión del contexto de autenticación.
      await auth.login(email, password);
      // Redirige al dashboard después de un inicio de sesión exitoso.
      router.push('/dashboard');
    } catch (error: any) {
        // Muestra una notificación de error si el inicio de sesión falla.
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: error.message,
        })
    }
    setLoading(false);
  };

  return (
    // Contenedor principal de la página.
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Tarjeta de inicio de sesión con efecto de desenfoque. */}
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
        {/* Formulario de inicio de sesión. */}
        <form onSubmit={handleLogin}>
            {/* Encabezado de la tarjeta. */}
            <CardHeader className="text-center">
              {/* Contenedor del logo. */}
              <div className="flex justify-center mb-4">
                <Logo />
              </div>
              {/* Título de la tarjeta. */}
              <CardTitle className="text-3xl font-bold">FijosDN</CardTitle>
              {/* Descripción de la tarjeta. */}
              <CardDescription>Gestión de Activos Fijos. Ingrese a su cuenta.</CardDescription>
            </CardHeader>
            {/* Contenido de la tarjeta con los campos de entrada. */}
            <CardContent className="space-y-4">
              {/* Campo de correo electrónico. */}
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="usuario@empresa.com" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {/* Campo de contraseña. */}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" placeholder="Ingresa tu contraseña" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </CardContent>
            {/* Pie de la tarjeta con el botón de inicio de sesión. */}
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </CardFooter>
        </form>
        {/* Enlace para registrarse. */}
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