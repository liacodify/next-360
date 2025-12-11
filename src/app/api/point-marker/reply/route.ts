import db from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tags, parentId, comment, urlFile, createdById } = body;

    if (!parentId || !comment || !createdById) {
      return NextResponse.json(
        { message: "Faltan datos obligatorios" },
        { status: 400 },
      );
    }

    const newReply = await db.pointMarker.create({
      data: {
        comment,
        urlFile: urlFile ?? null,
        parentId,
        createdById,
        Tags: tags,
      },
    });

    return NextResponse.json(newReply, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
