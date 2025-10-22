import Link from "next/link";

import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GroupsList from "./groups-list";
import {
  createGroupAction,
  deleteGroupAction,
  importGroupMembersAction,
  renameGroupAction
} from "./actions";

export default async function AdminGroupsPage() {
  const session = await requireRole("ADMIN");
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const [groups, memberCount] = await Promise.all([
    prisma.orgGroup.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { members: true }
        }
      }
    }),
    prisma.groupMember.count({
      where: { group: { orgId } }
    })
  ]);

  const createGroup = createGroupAction.bind(null, orgId);
  const renameGroup = renameGroupAction.bind(null, orgId);
  const deleteGroup = deleteGroupAction.bind(null, orgId);
  const importMembers = importGroupMembersAction.bind(null, orgId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-slate-100">Groups</CardTitle>
            <CardDescription className="prose prose-sm text-muted-foreground max-w-none">
              Organize learners into cohorts and manage their memberships. Import members from CSV to keep rosters in sync.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            asChild
            className="h-9 w-full justify-start px-0 text-muted-foreground hover:text-foreground sm:w-auto"
          >
            <Link href="/admin">← Back to admin</Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="text-slate-100">Create a new group</CardTitle>
          <CardDescription className="prose prose-sm text-muted-foreground max-w-none">
            Groups help you enroll cohorts into assignments and manage learners at scale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createGroup} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="name">Group name</Label>
              <Input id="name" name="name" required placeholder="e.g. Spring 2025 Cohort" />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Create group
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="text-slate-100">Current groups</CardTitle>
          <CardDescription className="prose prose-sm text-muted-foreground max-w-none">
            {groups.length === 0
              ? "No groups yet. Create one to get started."
              : `${groups.length} group${groups.length === 1 ? "" : "s"} with ${memberCount} total membership${memberCount === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupsList
            groups={groups}
            renameGroup={renameGroup}
            deleteGroup={deleteGroup}
            importMembers={importMembers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
