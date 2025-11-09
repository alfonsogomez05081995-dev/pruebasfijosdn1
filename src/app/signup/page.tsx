// Indica que este componente se ejecuta en el lado del cliente.
'use client';

// Importa los hooks useState y FormEvent de React para manejar el estado y los eventos del formulario.
import { useState, FormEvent } from 'react';
// Importa el hook useRouter de Next.js para la navegación.
import { useRouter } from 'next/navigation';
// Importa el componente Link de Next.js para la navegación entre páginas.
import Link from 'next/link';
// Importa el componente Button.
import { Button } from "@/components/ui/button";
// Importa los componentes de Card para la estructura de la interfaz.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Importa el componente Input para los campos de entrada.
import { Input } from "@/components/ui/input";
// Importa el componente Label para las etiquetas de los campos de entrada.
import { Label } from "@/components/ui/label";
// Importa el hook useToast para mostrar notificaciones.
import { useToast } from "@/hooks/use-toast";
// Importa las funciones de autenticación de Firebase.
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
// Importa las funciones de Firestore para interactuar con la base de datos.
import { getFirestore, doc, getDoc, writeBatch, collection, serverTimestamp } from "firebase/firestore";
// Importa la instancia de la aplicación de Firebase.
import { app } from '@/lib/firebase';

// Define el componente de la página de registro.
export default function SignupPage() {
  // Inicializa el router para la navegación.
  const router = useRouter();
  // Obtiene la función toast para mostrar notificaciones.
  const { toast } = useToast();
  // Define el estado para el nombre.
  const [name, setName] = useState('');
  // Define el estado para el correo electrónico.
  const [email, setEmail] = useState('');
  // Define el estado para la contraseña.
  const [password, setPassword] = useState('');
  // Define el estado para la carga.
  const [loading, setLoading] = useState(false);

  // Maneja el evento de registro de usuario.
  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    // Obtiene la instancia de autenticación y Firestore.
    const auth = getAuth(app);
    const db = getFirestore(app);
    // Convierte el correo electrónico a minúsculas.
    const lowerCaseEmail = email.toLowerCase();

    try {
      // 1. Verifica si existe una invitación válida en la colección 'invitations'.
      const invitationRef = doc(db, "invitations", lowerCaseEmail);
      const invitationSnap = await getDoc(invitationRef);

      // Si no existe una invitación, muestra un error.
      if (!invitationSnap.exists()) {
        throw new Error("No estás autorizado para registrarte, la invitación no es válida o ya fue usada. Contacta a un administrador.");
      }
      
      // Obtiene el rol y quién invitó al usuario de la invitación.
      const { role, invitedBy } = invitationSnap.data();

      // 2. Crea el usuario en Firebase Authentication.
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Actualiza el nombre de usuario en el perfil de Firebase Authentication.
      await updateProfile(user, { displayName: name });

      // 3. Usa una escritura por lotes para crear el nuevo documento de usuario y eliminar la invitación de forma atómica.
      const batch = writeBatch(db);

      // Crea una nueva referencia de documento en la colección 'users'.
      const newUserRef = doc(collection(db, "users"));

      // Establece los datos para el nuevo documento de usuario.
      batch.set(newUserRef, {
        uid: user.uid,
        name: name,
        email: lowerCaseEmail,
        role: role,
        invitedBy: invitedBy, // <-- Asegura que esto se guarde
        status: "activo",
        createdAt: serverTimestamp(),
      });

      // Elimina el documento de invitación usado.
      batch.delete(invitationRef);

      // Confirma la escritura por lotes atómica.
      await batch.commit();

      // Muestra una notificación de éxito.
      toast({ title: "¡Registro Exitoso!", description: "Tu cuenta ha sido creada. Ahora puedes iniciar sesión." });
      // Redirige a la página de inicio de sesión.
      router.push('/'); 

    } catch (error: any) {
      // Maneja los errores de registro.
      console.error("Error en el registro:", error);
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Este correo electrónico ya está en uso por otra cuenta.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      } else if (!error.message.startsWith("No estás autorizado")) {
        errorMessage = "Ocurrió un error inesperado durante el registro.";
      }
      
      // Muestra una notificación de error.
      toast({ variant: "destructive", title: "Error en el registro", description: errorMessage });
    } finally {
      // Finaliza el estado de carga.
      setLoading(false);
    }
  };

  return (
    // Contenedor principal de la página.
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Tarjeta de registro. */}
      <Card className="mx-auto max-w-sm">
        {/* Encabezado de la tarjeta. */}
        <CardHeader>
          <CardTitle className="text-2xl">Completar Registro</CardTitle>
          <CardDescription>
            Crea tu contraseña para activar tu cuenta. Debes haber recibido una invitación.
          </CardDescription>
        </CardHeader>
        {/* Contenido de la tarjeta con el formulario de registro. */}
        <CardContent>
          <form onSubmit={handleSignUp} className="grid gap-4">
            {/* Campo de nombre completo. */}
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            {/* Campo de correo electrónico. */}
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {/* Campo de contraseña. */}
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {/* Botón de registro. */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Finalizar Registro'}
            </Button>
          </form>
          {/* Enlace para iniciar sesión. */}
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
