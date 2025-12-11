import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: { id: string };
}

// GET → obtener un tag por id
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }, // params es Promise
) {
  const params = await context.params; // await para "desempaquetar"
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const tag = await db.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag no encontrado" }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error(`GET /api/tags/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Error al obtener tag" },
      { status: 500 },
    );
  }
}

// PUT → actualizar tag
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }, // params es Promise
) {
  const params = await context.params; // await para "desempaquetar"
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const { name, color } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }

    const tag = await db.tag.update({
      where: { id },
      data: {
        name,
        color: color ?? null,
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error(`PUT /api/tags/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Error al actualizar tag" },
      { status: 500 },
    );
  }
}

// DELETE → eliminar tag
export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }, // params es Promise
) {
  try {
    const params = await context.params; // await para "desempaquetar"
    const id = Number(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await db.tag.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Tag eliminado" });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al eliminar tag" },
      { status: 500 },
    );
  }
}
