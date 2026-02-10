import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const userWithCompanies = await db.user.findUnique({
      where: { id: userId },
      include: { UserCompany: { include: { company: true } } },
    });

    if (!userWithCompanies) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const companyIds = userWithCompanies.UserCompany.map((uc) => uc.companyId);

    const files = await db.file.findMany({
      where: {},
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Error fetching files" },
      { status: 500 },
    );
  }
}
