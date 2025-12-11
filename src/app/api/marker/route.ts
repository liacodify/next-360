import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET → obtener todos los markers
export async function GET() {
  try {
    const markers = await db.marker.findMany({});

    return NextResponse.json(markers);
  } catch (error) {
    console.error("GET /api/marker error:", error);
    return NextResponse.json(
      { error: "Error al obtener markers" },
      { status: 500 },
    );
  }
}

// POST → crear un marker
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { name, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: "El campo 'name' es obligatorio" },
        { status: 400 },
      );
    }

    const marker = await db.marker.create({
      data: {
        name,
        icon: icon ?? "",
      },
    });

    return NextResponse.json(marker, { status: 201 });
  } catch (error) {
    console.error("POST /api/marker error:", error);
    return NextResponse.json(
      { error: "Error al crear marker" },
      { status: 500 },
    );
  }
}

// PUT → actualizar un marker
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, icon } = body;

    if (!id) {
      return NextResponse.json(
        { error: "El campo 'id' es obligatorio" },
        { status: 400 },
      );
    }

    const marker = await db.marker.update({
      where: { id },
      data: {
        name,
        icon: icon ?? undefined,
      },
    });

    return NextResponse.json(marker);
  } catch (error) {
    console.error("PUT /api/marker error:", error);
    return NextResponse.json(
      { error: "Error al actualizar marker" },
      { status: 500 },
    );
  }
}

// DELETE → eliminar un marker
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { error: "El campo 'id' es obligatorio" },
        { status: 400 },
      );
    }

    await db.marker.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Marker eliminado" });
  } catch (error) {
    console.error("DELETE /api/marker error:", error);
    return NextResponse.json(
      { error: "Error al eliminar marker" },
      { status: 500 },
    );
  }
}
