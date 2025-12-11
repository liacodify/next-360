import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z, ZodError } from "zod";
import prisma from "@/lib/db";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(2),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword || "");
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Opcional: Rehashear password para mejorar seguridad
    const improvedHash = await bcrypt.hash(password, 10);
    if (improvedHash !== user.hashedPassword) {
      await prisma.user.update({
        where: { id: user.id },
        data: { hashedPassword: improvedHash },
      });
    }

    const { hashedPassword, ...userData } = user;

    return NextResponse.json({ user: userData });
  } catch (error) {
    if (error instanceof ZodError) {
      // Usa error.issues en vez de error.errors
      const formattedErrors: Record<string, string> = {};
      error.issues.forEach((e) => {
        if (e.path.length > 0) {
          const key = e.path[0].toString();
          if (!formattedErrors[key]) {
            formattedErrors[key] = e.message;
          }
        }
      });

      return NextResponse.json({ error: formattedErrors }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
