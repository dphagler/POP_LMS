import { auth } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(role: "ADMIN" | "INSTRUCTOR" | "LEARNER") {
  const session = await requireUser();
  const order = ["LEARNER", "INSTRUCTOR", "ADMIN"];
  const sessionRole = session.user?.role ?? "LEARNER";
  if (order.indexOf(sessionRole) < order.indexOf(role)) {
    throw new Error("Forbidden");
  }
  return session;
}

export function assertSameOrg(entityOrgId: string | null | undefined, sessionOrgId: string | null) {
  if (entityOrgId && sessionOrgId && entityOrgId !== sessionOrgId) {
    throw new Error("Cross-organization access denied");
  }
}

export async function ensureOrgThemeApplied(response: NextResponse) {
  const session = await auth();
  if (!session?.user?.orgId) return response;
  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { themeJson: true }
  });
  if (org?.themeJson) {
    response.cookies.set("pop-theme", JSON.stringify(org.themeJson));
  }
  return response;
}
