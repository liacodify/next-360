import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const file = await db.file.findUnique({
      where: { id },
      include: {
        gpsPoints: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 },
      );
    }

    const tags = await db.tag.findMany({
      where: {
        id: {
          in: file.tagIds ?? [],
        },
      },
    });

    return NextResponse.json({ ...file, tags });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
