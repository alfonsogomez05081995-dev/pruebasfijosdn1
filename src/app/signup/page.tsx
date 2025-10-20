'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { app } from '@/lib/firebase'; // Ensure you have a firebase app export

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

    const auth = getAuth(app);
    const db = getFirestore(app);

    try {
      // 1. Check for an invitation in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.toLowerCase()), where("status", "==", "invitado"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("No estás autorizado para registrarte o el correo ya fue usado. Contacta a un administrador.");
      }

      // 2. Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, { displayName: name });

      // 3. Update the user document in Firestore
      const userDoc = querySnapshot.docs[0]; // Get the invitation document
      const batch = writeBatch(db);
      batch.update(userDoc.ref, {
        name: name,
        uid: user.uid,
        status: "activo",
      });
      await batch.commit();

      toast({ title: "¡Registro Exitoso!", description: "Ahora puedes iniciar sesión." });
      router.push('/'); // Redirect to login page

    } catch (error: any) {
      console.error("Error en el registro:", error);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este correo electrónico ya está en uso.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      }
      toast({ variant: "destructive", title: "Error en el registro", description: errorMessage });
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