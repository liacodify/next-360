// /src/app/next-auth.d.ts (¡NUEVO ARCHIVO DE TIPOS!)

import "next-auth";
import "next-auth/jwt";

// 1. Tipar los campos personalizados que se añaden al objeto 'user'
//    Esto es lo que devuelve el método `authorize` del CredentialsProvider.
declare module "next-auth" {
  interface User {
    id: string; // Ya lo tienes
    email: string;
    role: string; // 👈 Tu campo personalizado
  }

  // 2. Tipar la interfaz de la sesión que ven tus componentes (useSession, getServerSession)
  interface Session {
    user: {
      id: string; // 👈 Lo añades a la sesión
      email: string;
      role: string; // 👈 Tu campo personalizado
      // Otros campos estándar como name (si los tienes)
    } & DefaultSession["user"];
  }
}

// 3. Tipar la interfaz del JWT (el token que viaja)
declare module "next-auth/jwt" {
  interface JWT {
    id: string; // 👈 Lo añades al token
    email: string;
    role: string; // 👈 Tu campo personalizado
  }
}
