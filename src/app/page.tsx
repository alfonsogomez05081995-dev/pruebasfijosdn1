import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
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
            <Input id="email" type="email" placeholder="usuario@empresa.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" asChild>
            <Link href="/dashboard">Ingresar</Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">O acceda como:</p>
          <div className="flex justify-center gap-2">
            <Button variant="link" className="p-0" asChild><Link href="/dashboard/master">Master</Link></Button>
            <Button variant="link" className="p-0" asChild><Link href="/dashboard/logistica">Logística</Link></Button>
            <Button variant="link" className="p-0" asChild><Link href="/dashboard/empleado">Empleado</Link></Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
}
