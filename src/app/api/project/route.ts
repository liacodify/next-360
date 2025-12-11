import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { id: "desc" },
      include: {
        File: true,
        PointMarker: true,
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/project error:", error);
    return NextResponse.json(
      { error: "Error al obtener proyectos" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "El campo 'name' es obligatorio" },
        { status: 400 },
      );
    }

    const project = await db.project.create({
      data: { name },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/project error:", error);
    return NextResponse.json(
      { error: "Error al crear proyecto" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json(
        { error: "El campo 'id' es obligatorio" },
        { status: 400 },
      );
    }

    const project = await db.project.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("PUT /api/project error:", error);
    return NextResponse.json(
      { error: "Error al actualizar proyecto" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "El campo 'id' es obligatorio" },
        { status: 400 },
      );
    }

    await db.project.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Proyecto eliminado" });
  } catch (error) {
    console.error("DELETE /api/project error:", error);
    return NextResponse.json(
      { error: "Error al eliminar proyecto" },
      { status: 500 },
    );
  }
}
