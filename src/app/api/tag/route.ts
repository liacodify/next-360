import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET → obtener todos los tags
export async function GET() {
  try {
    const tags = await db.tag.findMany();
    return NextResponse.json(tags);
  } catch (error) {
    console.error("GET /api/tags error:", error);
    return NextResponse.json(
      { error: "Error al obtener tags" },
      { status: 500 },
    );
  }
}

// POST → crear tag
export async function POST(req: NextRequest) {
  try {
    const { name, color } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "El campo 'name' es obligatorio" },
        { status: 400 },
      );
    }

    const tag = await db.tag.create({
      data: {
        name,
        color: color ?? null,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("POST /api/tags error:", error);
    return NextResponse.json({ error: "Error al crear tag" }, { status: 500 });
  }
}
