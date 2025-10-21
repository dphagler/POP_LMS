import type { Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

type SessionWithUser = Session & {
  user: Session["user"] & {
    id: string;
    orgId: string | null;
    role: UserRole;
  };
};

function ensureSession(session: Session | null): asserts session is SessionWithUser {
  if (!session?.user?.id) {
    redirect("/login");
  }
}

export async function requireUser() {
  const session = await auth();
  ensureSession(session);
  return session;
}

export async function requireRole(role: "ADMIN" | "INSTRUCTOR" | "LEARNER") {
  const session = await requireUser();
  const order = ["LEARNER", "INSTRUCTOR", "ADMIN"];
  const sessionRole = session.user.role ?? "LEARNER";
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
