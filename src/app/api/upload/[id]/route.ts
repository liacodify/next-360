import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // 👈 CLAVE
    const fileId = Number(id);

    if (isNaN(fileId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await db.$transaction([
      db.gpsPoint.deleteMany({
        where: { fileId },
      }),
      db.file.delete({
        where: { id: fileId },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Error eliminando archivo" },
      { status: 500 },
    );
  }
}
