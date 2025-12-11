import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir archivos estáticos y rutas públicas sin auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Si es ruta pública (login) y ya está autenticado, redirigir a home
  if (PUBLIC_PATHS.includes(pathname)) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (token) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return NextResponse.next();
  }

  // Verificar token para rutas protegidas
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // No autenticado, redirigir a login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Autenticado, continuar
  return NextResponse.next();
}

// Configurar rutas donde se aplica middleware
export const config = {
  matcher: ["/((?!_next|api/auth|static).*)"], // bloquear todas menos las internas de next y auth
};
