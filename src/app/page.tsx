// /app/page.tsx

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export default async function HomeRedirect() {
  // 1. Obtener la sesión del servidor usando las opciones configuradas de Auth.js
  const session = await getServerSession(authOptions);

  // 2. Verificar si el usuario está autenticado
  // En Auth.js, el objeto 'session' está presente si la sesión es válida.
  if (session?.user) {
    // Si está logueado, redirigir a /home (o donde sea tu ruta de inicio de app)
    redirect("/home");
  } else {
    // Si NO está logueado, redirigir a /login
    redirect("/login");
  }
}
