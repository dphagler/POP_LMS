import type { Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

type BaseSessionUser = Session["user"] & {
  id: string;
  orgId: string | null;
  role: UserRole;
};

export type SessionWithUser = Session & { user: BaseSessionUser };

export type AdminAccessRole = "ADMIN" | "MANAGER";

function ensureSession(session: Session | null): asserts session is SessionWithUser {
  if (!session?.user?.id) {
    redirect("/signin");
  }
}

export async function requireUser(): Promise<SessionWithUser> {
  const session = await auth();
  ensureSession(session);
  return session;
}

export function isAdmin(session: Session | null | undefined): session is SessionWithUser {
  return Boolean(session?.user?.role === UserRole.ADMIN);
}

export function isManager(session: Session | null | undefined): boolean {
  if (!session?.user?.role) {
    return false;
  }

  return session.user.role === UserRole.INSTRUCTOR || session.user.role === UserRole.ADMIN;
}

export function resolveAdminAccessRole(session: Session | null | undefined): AdminAccessRole | null {
  if (!session?.user?.role) {
    return null;
  }

  if (session.user.role === UserRole.ADMIN) {
    return "ADMIN";
  }

  if (session.user.role === UserRole.INSTRUCTOR) {
    return "MANAGER";
  }

  return null;
}

export async function requireAdminAccess(allowedRoles: AdminAccessRole[] = ["ADMIN"]): Promise<{
  session: SessionWithUser;
  role: AdminAccessRole;
}> {
  const session = await requireUser();
  const role = resolveAdminAccessRole(session);

  if (!role || !allowedRoles.includes(role)) {
    redirect("/app");
  }

  return { session, role };
}

export async function requireRole(role: "ADMIN" | "INSTRUCTOR" | "LEARNER") {
  const session = await requireUser();
  const order = ["LEARNER", "INSTRUCTOR", "ADMIN"] as const;
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
    select: { themePrimary: true, themeAccent: true, loginBlurb: true }
  });
  if (org) {
    response.cookies.set(
      "pop-theme",
      JSON.stringify({
        themePrimary: org.themePrimary,
        themeAccent: org.themeAccent,
        loginBlurb: org.loginBlurb,
      })
    );
  }
  return response;
}
