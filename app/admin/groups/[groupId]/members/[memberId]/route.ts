import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildRateLimitKey, enforceApiRateLimit } from "@/lib/api-rate-limit";
import { createLogger } from "@/lib/logger";

const logger = createLogger({ component: "admin.group_members" });
const RATE_LIMIT_WINDOW_SECONDS = 10;
const RATE_LIMIT_MAX_REQUESTS = 10;

export async function DELETE(request: Request, { params }: { params: { groupId: string; memberId: string } }) {
  const session = await requireRole("ADMIN");
  const orgId = session.user.orgId;

  if (!orgId) {
    return NextResponse.json({ error: "Organization not found." }, { status: 403 });
  }

  const rateLimitKey = buildRateLimitKey(
    `admin.group.${params.groupId}.member_remove`,
    request,
    session.user.id ?? undefined
  );
  const rateLimitResponse = await enforceApiRateLimit({
    key: rateLimitKey,
    limit: RATE_LIMIT_MAX_REQUESTS,
    windowInSeconds: RATE_LIMIT_WINDOW_SECONDS,
    message: "Too many remove requests. Please wait a moment and try again.",
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const membership = await prisma.groupMember.findUnique({
      where: { id: params.memberId },
      select: {
        id: true,
        groupId: true,
        group: { select: { orgId: true } },
      },
    });

    if (!membership || membership.groupId !== params.groupId || membership.group.orgId !== orgId) {
      return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    }

    await prisma.groupMember.delete({ where: { id: membership.id } });

    revalidatePath(`/admin/groups/${params.groupId}`);
    revalidatePath("/admin/groups");

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({
      event: "admin.group_members.remove_failed",
      groupId: params.groupId,
      memberId: params.memberId,
      error,
    });
    return NextResponse.json({ error: "Unable to remove member." }, { status: 500 });
  }
}
