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
import { getFirestore, doc, getDoc, writeBatch, collection, serverTimestamp } from "firebase/firestore";
import { app } from '@/lib/firebase';

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
    const lowerCaseEmail = email.toLowerCase();

    try {
      // 1. Check for a valid invitation in the 'invitations' collection
      const invitationRef = doc(db, "invitations", lowerCaseEmail);
      const invitationSnap = await getDoc(invitationRef);

      if (!invitationSnap.exists()) {
        throw new Error("No estás autorizado para registrarte, la invitación no es válida o ya fue usada. Contacta a un administrador.");
      }
      
      const { role, invitedBy } = invitationSnap.data();

      // 2. Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase Auth profile display name
      await updateProfile(user, { displayName: name });

      // 3. Use a batch write to create the new user document and delete the invitation atomically
      const batch = writeBatch(db);

      // Create a new document reference in the 'users' collection
      const newUserRef = doc(collection(db, "users"));

      // Set the data for the new user document
      batch.set(newUserRef, {
        uid: user.uid,
        name: name,
        email: lowerCaseEmail,
        role: role,
        invitedBy: invitedBy, // <-- Ensure this is saved
        status: "activo",
        createdAt: serverTimestamp(),
      });

      // Delete the used invitation document
      batch.delete(invitationRef);

      // Commit the atomic batch write
      await batch.commit();

      toast({ title: "¡Registro Exitoso!", description: "Tu cuenta ha sido creada. Ahora puedes iniciar sesión." });
      router.push('/'); // Redirect to login page

    } catch (error: any) {
      console.error("Error en el registro:", error);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este correo electrónico ya está en uso por otra cuenta.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      } else if (!error.message.startsWith("No estás autorizado")) {
        errorMessage = "Ocurrió un error inesperado durante el registro.";
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
          <CardTitle className="text-2xl">Completar Registro</CardTitle>
          <CardDescription>
            Crea tu contraseña para activar tu cuenta. Debes haber recibido una invitación.
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
              {loading ? 'Creando cuenta...' : 'Finalizar Registro'}
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
