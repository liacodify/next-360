import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    const id = parts[parts.length - 1];

    const user = await db.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user)
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const url = new URL(req.url);
    const id = Number(url.pathname.split("/").pop());

    const body = await req.json();
    const { companyIds, hashedPassword, ...userData } = body;
    const dataToUpdate: any = {
      ...userData,
      ...(hashedPassword
        ? { hashedPassword: await bcrypt.hash(hashedPassword, 10) }
        : {}),
    };

    if (Array.isArray(companyIds)) {
      dataToUpdate.UserCompany = {
        deleteMany: {
          userId: id,
        },
        create: companyIds.map((companyId: number) => ({
          companyId,
        })),
      };
    }

    console.log(dataToUpdate);
    const updated = await db.user.update({
      where: { id },
      data: dataToUpdate,
      include: {
        UserCompany: {
          include: {
            company: true,
          },
        },
      },
    });

    const { hashedPassword: removed, ...safeUser } = updated;

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/");
    const id = parts[parts.length - 1];

    await db.user.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error al eliminar usuario" },
      { status: 500 },
    );
  }
}
