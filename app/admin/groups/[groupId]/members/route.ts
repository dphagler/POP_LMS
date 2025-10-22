import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { buildRateLimitKey, enforceApiRateLimit } from "@/lib/api-rate-limit";
import { revalidatePath } from "next/cache";

const logger = createLogger({ component: "admin.group_members" });
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_WINDOW_SECONDS = 10;
const RATE_LIMIT_MAX_REQUESTS = 10;

export async function POST(request: Request, { params }: { params: { groupId: string } }) {
  const session = await requireRole("ADMIN");
  const orgId = session.user.orgId;

  if (!orgId) {
    return NextResponse.json({ error: "Organization not found." }, { status: 403 });
  }

  const group = await prisma.orgGroup.findUnique({
    where: { id: params.groupId },
    select: { id: true, orgId: true },
  });

  if (!group || group.orgId !== orgId) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const rateLimitKey = buildRateLimitKey(
    `admin.group.${group.id}.member_add`,
    request,
    session.user.id ?? undefined
  );
  const rateLimitResponse = await enforceApiRateLimit({
    key: rateLimitKey,
    limit: RATE_LIMIT_MAX_REQUESTS,
    windowInSeconds: RATE_LIMIT_WINDOW_SECONDS,
    message: "Too many add requests. Please wait a moment and try again.",
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    logger.warn({ event: "admin.group_members.invalid_json", error });
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const userId = typeof (body as { userId?: unknown })?.userId === "string" ? (body as { userId?: string }).userId : null;
  const rawEmail = typeof (body as { email?: unknown })?.email === "string" ? (body as { email?: string }).email : null;
  const normalizedEmail = rawEmail?.trim().toLocaleLowerCase();
  const name = typeof (body as { name?: unknown })?.name === "string" ? (body as { name?: string }).name?.trim() || null : null;

  if (!userId && !normalizedEmail) {
    return NextResponse.json({ error: "A user or email address is required." }, { status: 400 });
  }

  if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json({ error: "Email address is invalid." }, { status: 400 });
  }

  try {
    type SelectedUser = { id: string; email: string; name: string | null; orgId: string };
    let user: SelectedUser | null = null;

    if (userId) {
      user = (await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, orgId: true },
      })) as SelectedUser | null;

      if (!user || user.orgId !== orgId) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
    } else if (normalizedEmail) {
      user = (await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true, name: true, orgId: true },
      })) as SelectedUser | null;

      if (user && user.orgId !== orgId) {
        return NextResponse.json({ error: "Email belongs to a user in another organization." }, { status: 400 });
      }

      if (!user) {
        user = (await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: name || null,
            orgId,
          },
          select: { id: true, email: true, name: true, orgId: true },
        })) as SelectedUser;
      } else if (name && name !== (user.name ?? "")) {
        user = (await prisma.user.update({
          where: { id: user.id },
          data: { name },
          select: { id: true, email: true, name: true, orgId: true },
        })) as SelectedUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Unable to determine user." }, { status: 400 });
    }

    const membership = await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      update: {},
      create: { groupId: group.id, userId: user.id },
      select: { id: true },
    });

    revalidatePath(`/admin/groups/${group.id}`);
    revalidatePath("/admin/groups");

    return NextResponse.json({
      member: {
        membershipId: membership.id,
        userId: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error({
      event: "admin.group_members.add_failed",
      groupId: group.id,
      error,
    });
    return NextResponse.json({ error: "Unable to add member." }, { status: 500 });
  }
}
