import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";

export async function GET() {
  try {
    const users = await db.user.findMany();
    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, hashedPassword, role } = await req.json();

    // Hashear con bcryptjs (PURO JS, sin binarios nativos)
    const password = await bcrypt.hash(hashedPassword, 10);

    const newUser = await db.user.create({
      data: {
        name,
        email,
        hashedPassword: password,
        role: role || "USER",
      },
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 },
    );
  }
}
