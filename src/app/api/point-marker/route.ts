import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId requerido" }, { status: 400 });
  }

  // Obtener los pointMarkers con las relaciones
  const data = await db.pointMarker.findMany({
    where: { projectId: Number(projectId) },
    include: {
      marker: true,
      user: true,
      replies: true,
    },
    orderBy: { id: "asc" },
  });

  // Extraer todos los IDs únicos de tags (campo Tags en mayúscula)
  const allTagIds = Array.from(new Set(data.flatMap((p) => p.Tags || [])));

  const tags = await db.tag.findMany({
    where: { id: { in: allTagIds } },
  });

  console.log(allTagIds);

  const dataWithTags = data.map((p) => ({
    ...p,
    tags: p.Tags
      ? p.Tags.map((tagId) => tags.find((t) => t.id === tagId)).filter(Boolean)
      : [],
  }));

  return NextResponse.json(dataWithTags);
}

// POST → crear un pointMarker
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      lat,
      lon,
      comment,
      urlFile,
      markerId,
      projectId,
      parentId,
      createdById,
      tags,
      referenceMeter,
    } = body;

    if (
      lat === undefined ||
      lon === undefined ||
      !comment ||
      !markerId ||
      !createdById
    ) {
      return NextResponse.json(
        { error: "Campos obligatorios faltantes" },
        { status: 400 },
      );
    }

    const pointMarker = await db.pointMarker.create({
      data: {
        lat,
        lon,
        comment,
        urlFile: urlFile ?? null,
        markerId,
        projectId: projectId ?? null,
        parentId: parentId ?? null,
        createdById,
        referenceMeter,
        Tags: tags ? tags : [],
      },
    });

    return NextResponse.json(pointMarker, { status: 201 });
  } catch (error) {
    console.error("POST /api/point-marker error:", error);
    return NextResponse.json(
      { error: "Error al crear pointMarker" },
      { status: 500 },
    );
  }
}

// PUT → actualizar un pointMarker
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      lat,
      lon,
      comment,
      urlFile,
      markerId,
      projectId,
      parentId,
      createdById,
      tags,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "El campo 'id' es obligatorio" },
        { status: 400 },
      );
    }

    // Actualizar pointMarker
    const pointMarker = await db.pointMarker.update({
      where: { id },
      data: {
        lat,
        lon,
        comment,
        urlFile: urlFile ?? undefined,
        markerId,
        projectId,
        parentId,
        createdById,
        Tags: tags ? tags : [],
      },
    });

    return NextResponse.json(pointMarker);
  } catch (error) {
    console.error("PUT /api/point-marker error:", error);
    return NextResponse.json(
      { error: "Error al actualizar pointMarker" },
      { status: 500 },
    );
  }
}

// DELETE → eliminar un pointMarker
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

    await db.pointMarker.delete({
      where: { id },
    });

    return NextResponse.json({ message: "PointMarker eliminado" });
  } catch (error) {
    console.error("DELETE /api/point-marker error:", error);
    return NextResponse.json(
      { error: "Error al eliminar pointMarker" },
      { status: 500 },
    );
  }
}
