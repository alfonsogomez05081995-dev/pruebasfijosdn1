'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth } from '@/contexts/AuthContext'; // Corrected import
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      await auth.login(email, password);
      router.push('/dashboard');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: error.message,
        })
    }
    setLoading(false);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
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
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="usuario@empresa.com" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" placeholder="Ingresa tu contraseña" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </CardFooter>
        </form>
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