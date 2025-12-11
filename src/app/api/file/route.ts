// src/app/api/file/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db"; // ajusta la ruta a tu prisma client
import bcrypt from "bcryptjs"; // si necesitas para crear usuarios, si no, quita

export async function GET() {
  try {
    const files = await db.file.findMany({
      include: {
        project: true,
      },
    });
    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Error fetching files" },
      { status: 500 },
    );
  }
}
