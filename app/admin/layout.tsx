import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { resolveOrgName } from "@/lib/org";
import { requireRole } from "@/lib/authz";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireRole("ADMIN");
  const { user } = session;

  const orgName = await resolveOrgName(user.orgId);
  return (
    <AppShell
      orgName={orgName}
      pageTitle="Admin"
      userName={user.name}
      userImage={user.image}
      sidebarLinks={[]}
    >
      {children}
    </AppShell>
  );
}
