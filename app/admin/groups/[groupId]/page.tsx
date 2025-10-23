import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

import ImportMembersForm from "../import-form";
import { importGroupMembersAction } from "../actions";
import MembersPanel, { type GroupMemberDisplay } from "./members-panel";

type GroupPageParams = {
  groupId: string;
};

export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<GroupPageParams>;
}) {
  const { groupId } = await params;
  const session = await requireRole("ADMIN");
  const orgId = session.user.orgId;

  if (!orgId) {
    notFound();
  }

  const group = await prisma.orgGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      orgId: true,
      members: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          user: {
            name: "asc",
          },
        },
      },
    },
  });

  if (!group || group.orgId !== orgId) {
    notFound();
  }

  const initialMembers: GroupMemberDisplay[] = group.members
    .map((membership) => ({
      membershipId: membership.id,
      userId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
    }))
    .sort((a, b) => {
      const left = a.name?.toLocaleLowerCase() ?? a.email.toLocaleLowerCase();
      const right = b.name?.toLocaleLowerCase() ?? b.email.toLocaleLowerCase();
      return left.localeCompare(right, undefined, { sensitivity: "base" });
    });

  const importMembers = importGroupMembersAction.bind(null, orgId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">{group.name}</CardTitle>
            <CardDescription className="max-w-2xl text-sm text-muted-foreground">
              Manage members for this group. Add or invite individual users and keep rosters up to date with CSV imports.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            asChild
            className="h-9 w-full justify-start px-0 text-muted-foreground hover:text-foreground sm:w-auto"
          >
            <Link href="/admin/groups">← Back to groups</Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <MembersPanel
          groupId={group.id}
          groupName={group.name}
          initialMembers={initialMembers}
        />
        <Card>
          <CardHeader className="space-y-2 pb-4">
            <CardTitle>Import members</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Upload a CSV with <code>email</code> and <code>name</code> columns to add or update memberships in bulk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportMembersForm groupId={group.id} action={importMembers} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
