import { NextRequest, NextResponse } from "next/server";

import { PointMarker, Tag } from "@prisma/client";
import db from "@/lib/db";

type PointMarkerWithRelations = PointMarker & {
  tags: Tag[];
  replies: PointMarkerWithRelations[];
};
async function getRepliesWithTags(
  parentId: number,
): Promise<PointMarkerWithRelations[]> {
  const replies = await db.pointMarker.findMany({
    where: { parentId },
    orderBy: { createdAt: "asc" },
  });

  const repliesWithTags: PointMarkerWithRelations[] = await Promise.all(
    replies.map(async (reply) => {
      const tags = await db.tag.findMany({
        where: { id: { in: reply.Tags } },
      });

      const children = await getRepliesWithTags(reply.id);

      return {
        ...reply,
        tags,
        replies: children,
      };
    }),
  );

  return repliesWithTags;
}
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params;
  const id = Number(params.id);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Id inválido" }, { status: 400 });
  }

  const pointMarker = await db.pointMarker.findUnique({
    where: { id },
  });

  if (!pointMarker) {
    return NextResponse.json(
      { error: "Marcador no encontrado" },
      { status: 404 },
    );
  }

  const tags = await db.tag.findMany({
    where: { id: { in: pointMarker.Tags } },
  });

  const replies = await getRepliesWithTags(pointMarker.id);

  return NextResponse.json({
    ...pointMarker,
    tags,
    replies,
  });
}
