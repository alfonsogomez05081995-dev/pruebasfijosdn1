'use client';

// Importaciones de React y Next.js
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Importaciones de componentes de UI y hooks personalizados
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Importaciones de Firebase para autenticación y base de datos
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, getDoc, writeBatch, collection, serverTimestamp } from "firebase/firestore";
import { app } from '@/lib/firebase'; // Importa la instancia de la app de Firebase

/**
 * Componente SignupPage.
 * Permite a un usuario registrarse en el sistema, pero solo si ha sido previamente invitado.
 */
export default function SignupPage() {
  // --- Hooks y Estados ---
  const router = useRouter();
  const { toast } = useToast();
  
  // Estados para los campos del formulario de registro
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Maneja el proceso de registro de un nuevo usuario.
   * @param {FormEvent<HTMLFormElement>} event - El evento del formulario.
   */
  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const auth = getAuth(app);
    const db = getFirestore(app);
    const lowerCaseEmail = email.toLowerCase(); // Normaliza el email a minúsculas

    try {
      // 1. Verificar si existe una invitación válida en la colección 'invitations'.
      // El registro está restringido solo a correos invitados.
      const invitationRef = doc(db, "invitations", lowerCaseEmail);
      const invitationSnap = await getDoc(invitationRef);

      if (!invitationSnap.exists()) {
        throw new Error("No estás autorizado para registrarte, la invitación no es válida o ya fue usada. Contacta a un administrador.");
      }
      
      // Extrae el rol y quién invitó desde el documento de invitación.
      const { role, invitedBy } = invitationSnap.data();

      // 2. Crear el usuario en Firebase Authentication.
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Actualiza el perfil de Firebase Auth con el nombre del usuario.
      await updateProfile(user, { displayName: name });

      // 3. Usar una escritura por lotes (batch write) para garantizar la atomicidad.
      // Esto asegura que o se crean los datos del usuario Y se borra la invitación, o no se hace nada.
      const batch = writeBatch(db);

      // Crea una referencia para un nuevo documento en la colección 'users'.
      const newUserRef = doc(collection(db, "users"));

      // Define los datos para el nuevo documento de usuario en Firestore.
      batch.set(newUserRef, {
        uid: user.uid,
        name: name,
        email: lowerCaseEmail,
        role: role, // Rol asignado en la invitación.
        invitedBy: invitedBy, // ID del master que lo invitó.
        status: "activo", // El usuario se crea como 'activo'.
        createdAt: serverTimestamp(), // Marca de tiempo del servidor.
      });

      // Elimina el documento de invitación para que no pueda ser reutilizado.
      batch.delete(invitationRef);

      // Ejecuta todas las operaciones del lote de forma atómica.
      await batch.commit();

      toast({ title: "¡Registro Exitoso!", description: "Tu cuenta ha sido creada. Ahora puedes iniciar sesión." });
      router.push('/'); // Redirige al usuario a la página de inicio de sesión.

    } catch (error: any) {
      console.error("Error en el registro:", error);
      // Manejo de errores comunes de Firebase para dar feedback claro al usuario.
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
      setLoading(false); // Asegura que el estado de carga se desactive siempre.
    }
  };

  // --- Renderizado del Componente ---
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
