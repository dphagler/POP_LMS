import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const EMAIL_SEARCH_LIMIT = 8;

type RouteContext = {
  params: Promise<{ groupId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const session = await requireRole("ADMIN");
  const orgId = session.user.orgId;

  if (!orgId) {
    return NextResponse.json({ users: [] });
  }

  const { groupId } = await params;

  const group = await prisma.orgGroup.findUnique({
    where: { id: groupId },
    select: { id: true, orgId: true },
  });

  if (!group || group.orgId !== orgId) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") ?? "";
  const query = rawQuery.trim();

  if (!query) {
    return NextResponse.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      orgId,
      groupMemberships: {
        none: { groupId: group.id },
      },
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: [
      { name: "asc" },
      { email: "asc" },
    ],
    take: EMAIL_SEARCH_LIMIT,
  });

  return NextResponse.json({
    users: users.map((user) => ({ id: user.id, email: user.email, name: user.name })),
  });
}
