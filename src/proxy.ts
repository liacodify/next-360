// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = ["/login"];
const ADMIN_ONLY = ["/user"]; // <-- Rutas que requieren ADMIN

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("Middleware START:", pathname);

  // Permitir archivos estáticos y rutas públicas
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    console.log("Middleware END: Public / Bypass");
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  console.log(
    `Middleware CHECK: Token status -> ${token ? "Authenticated" : "Unauthenticated"}`,
  );

  // No autenticado
  if (!token) {
    console.log("Middleware END: Redirect to /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isAdmin = token.role === "ADMIN";

  const isAdminRoute = ADMIN_ONLY.some((route) => pathname.startsWith(route));

  if (isAdminRoute && !isAdmin) {
    console.log("Middleware BLOCKED: User lacks ADMIN role");

    const homeUrl = new URL("/home", request.url);
    return NextResponse.redirect(homeUrl);
  }
  // ---------------------------------------------------

  console.log("Middleware END: Authorized Access");
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next|api/auth|static).*)"],
};
