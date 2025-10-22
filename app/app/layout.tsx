import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export default async function LearnerAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireUser();
  const { user } = session;

  const organization = user.orgId
    ? await prisma.organization.findUnique({
        where: { id: user.orgId },
        select: { name: true },
      })
    : null;

  const orgName = organization?.name ?? "POP Initiative";

  return (
    <AppShell
      orgName={orgName}
      userName={user.name}
      userImage={user.image}
      sidebarLinks={[
        { href: "#today", label: "Today", isActive: true },
        { href: "#up-next", label: "Up Next" },
        { href: "#completed", label: "Completed" },
      ]}
    >
      {children}
    </AppShell>
  );
}
