import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
type Params = {
  params: {
    id: string;
  };
};

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
    const videoCollection = await db.videoCollection.findUnique({
      where: { id },
      include: {
        files: {
          orderBy: {
            order: "asc", // 🔑 orden de los files
          },
          include: {
            gpsPoints: {
              orderBy: {
                second: "asc", // 🔑 orden interno de los puntos GPS
              },
            },
          },
        },
        project: {
          include: {
            PointMarker: {
              include: {
                marker: true,
              },
            },
            locations: true,
          },
        },
      },
    });

    if (!videoCollection) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 },
      );
    }

    const tags = await db.tag.findMany({
      where: {
        id: {
          in: videoCollection.tagIds ?? [],
        },
      },
    });

    return NextResponse.json({ ...videoCollection, tags });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    console.log("asda");
    const { id } = await params;

    const idNumber = Number(id);

    const body = await req.json();
    const { name, projectId, date, tagIds } = body;

    if (isNaN(idNumber)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const updated = await db.videoCollection.update({
      where: { id: idNumber },
      data: {
        name,
        projectId,
        tagIds,
        date: new Date(date),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al actualizar VideoCollection" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const idNumber = Number(id);

    if (isNaN(idNumber)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await db.videoCollection.delete({
      where: { id: idNumber },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al eliminar VideoCollection" },
      { status: 500 },
    );
  }
}
