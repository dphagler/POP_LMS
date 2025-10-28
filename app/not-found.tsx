import Link from "next/link";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { resolveAdminAccessRole } from "@/lib/authz";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { AdminNotFound } from "@/components/admin/AdminNotFound";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

export default async function NotFound() {
  const [session, pathname] = await Promise.all([auth(), resolveRequestedPath()]);
  const isAdminPath = pathname.startsWith("/admin");

  if (isAdminPath) {
    const role = resolveAdminAccessRole(session);
    const navItems = role ? ADMIN_NAV.filter((item) => item.roles.includes(role)) : ADMIN_NAV;
    return <AdminNotFound navItems={navItems} />;
  }

  const isSignedIn = Boolean(session?.user?.id);

  return (
    <PageContainer className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1 text-sm font-medium uppercase tracking-wide text-slate-200">
        404
      </div>
      <h1 className="text-balance text-3xl font-semibold">Page not found</h1>
      <p className="max-w-md text-pretty text-base text-muted-foreground">
        The link you followed is no longer available. Double-check the address or choose one of the options below to get back on track.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {isSignedIn ? (
          <Button as={Link} href="/app" size="lg">
            Go to dashboard
          </Button>
        ) : (
          <Button as={Link} href="/" size="lg" variant="outline">
            Go home
          </Button>
        )}
      </div>
    </PageContainer>
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

  return "/";
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
