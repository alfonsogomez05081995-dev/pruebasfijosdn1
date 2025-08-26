
'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const loginSuccess = login(email, password);
    if (loginSuccess) {
        router.push('/dashboard');
    } else {
        toast({
            variant: "destructive",
            title: "Error de Autenticación",
            description: "El correo electrónico o la contraseña son incorrectos.",
        })
    }
  };
  
  const handleQuickAccess = (role: 'Master' | 'Logistica' | 'Empleado') => {
    let credentials = { email: '', password: 'password' }; // Correct password for quick access
    switch (role) {
        case 'Master':
            credentials.email = 'luisgm.ldv@gmail.com';
            break;
        case 'Logistica':
            credentials.email = 'logistica@empresa.com';
            break;
        case 'Empleado':
            credentials.email = 'empleado@empresa.com';
            break;
    }
    if (login(credentials.email, credentials.password)) {
        router.push('/dashboard');
    }
  }

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
                <Input id="password" type="password" placeholder="La contraseña es 'password'" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" type="submit">
                Ingresar
              </Button>
            </CardFooter>
        </form>
         <div className="px-6 pb-6 flex flex-col gap-4">
            <p className="text-xs text-center text-muted-foreground">O acceda como:</p>
              <div className="flex justify-center gap-2">
                <Button variant="link" className="p-0" onClick={() => handleQuickAccess('Master')}>Master</Button>
                <Button variant="link" className="p-0" onClick={() => handleQuickAccess('Logistica')}>Logística</Button>
                <Button variant="link" className="p-0" onClick={() => handleQuickAccess('Empleado')}>Empleado</Button>
              </div>
          </div>
      </Card>
    </main>
  );
}
