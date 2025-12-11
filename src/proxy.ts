// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir archivos estáticos y rutas públicas sin auth
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") || // para NextAuth routes
    pathname.startsWith("/static") ||
    pathname.includes(".") || // archivos estáticos
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Verificar token de sesión JWT
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // No autenticado, redirigir a login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Autenticado, continuar
  return NextResponse.next();
}

// Configurar rutas donde se aplica middleware
export const config = {
  matcher: ["/((?!login|_next|api/auth|static).*)"], // bloquea todo excepto login y rutas internas Next
};
