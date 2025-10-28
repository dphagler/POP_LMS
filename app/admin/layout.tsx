import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShellProvider } from "@/components/admin/AdminShell";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { requireAdminAccess, type AdminAccessRole } from "@/lib/authz";
import { resolveOrgName } from "@/lib/org";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { session, role } = await requireAdminAccess(["ADMIN", "MANAGER"]);
  const pathname = await resolveRequestedPath();
  const navMatch = matchNavItem(pathname);

  if (navMatch && !navMatch.roles.includes(role)) {
    redirect("/app");
  }

  if (!navMatch && role !== "ADMIN") {
    redirect("/app");
  }

  const orgName = await resolveOrgName(session.user.orgId);
  const navItems = ADMIN_NAV.filter((item) => item.roles.includes(role));

  return (
    <AdminShellProvider
      value={{
        navItems,
        user: {
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null
        },
        org: {
          id: session.user.orgId ?? null,
          name: orgName,
          options: [
            {
              id: session.user.orgId ?? "current-org",
              name: orgName
            }
          ]
        },
        role
      }}
    >
      {children}
    </AdminShellProvider>
  );
}

async function resolveRequestedPath(): Promise<string> {
  const headerList = await headers();
  const candidates = [
    headerList.get("x-invoke-path"),
    headerList.get("x-internal-nextjs-url"),
    headerList.get("x-matched-path"),
    headerList.get("x-next-pathname"),
    headerList.get("x-nextjs-matched-path"),
    headerList.get("next-url"),
    headerList.get("referer")
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const path = extractPathname(candidate);
    if (path) {
      return path;
    }
  }

  return "/admin";
}

function extractPathname(candidate: string): string | null {
  try {
    if (candidate.startsWith("http")) {
      return new URL(candidate).pathname;
    }

    if (candidate.startsWith("/")) {
      return candidate;
    }

    return new URL(candidate, "http://localhost").pathname;
  } catch {
    return null;
  }
}

function matchNavItem(pathname: string): { roles: AdminAccessRole[] } | null {
  for (const item of ADMIN_NAV) {
    if (isPathMatch(item.href, Boolean(item.exact), pathname)) {
      return { roles: item.roles };
    }
  }

  return null;
}

function isPathMatch(href: string, exact: boolean, pathname: string): boolean {
  if (exact) {
    return pathname === href;
  }

  if (pathname === href) {
    return true;
  }

  const normalized = href.endsWith("/") ? href.slice(0, -1) : href;
  return pathname.startsWith(`${normalized}/`);
}
