'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from '@/lib/firebase';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      // 1. Check for invitation
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("No estás autorizado para registrarte. Contacta a un administrador.");
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.status !== 'invitado') {
        throw new Error("Este correo ya ha sido registrado.");
      }

      // 2. Create user in Firebase Auth
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Update user document in Firestore
      const batch = writeBatch(db);
      batch.update(userDoc.ref, {
        name: name,
        uid: user.uid,
        status: 'activo'
      });
      await batch.commit();

      toast({ title: "¡Registro Exitoso!", description: "Ahora puedes iniciar sesión." });
      router.push('/'); // Redirect to login page

    } catch (error: any) {
      console.error("Error en el registro:", error);
      toast({ variant: "destructive", title: "Error en el registro", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Registro</CardTitle>
          <CardDescription>
            Completa tus datos para crear tu cuenta. Debes haber sido invitado por un administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/" className="underline">
              Inicia Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
