import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ImportMembersForm from "./import-form";
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" asChild className="w-fit px-0 text-muted-foreground hover:text-foreground">
          <Link href="/admin">← Back to admin</Link>
        </Button>
        <h1 className="text-3xl font-semibold">Groups</h1>
        <p className="text-sm text-muted-foreground">
          Organize learners into cohorts and manage their memberships. Import members from CSV to keep rosters in sync.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new group</CardTitle>
          <CardDescription>Groups help you enroll cohorts into assignments and manage learners at scale.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createGroup} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Group name
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. Spring 2025 Cohort"
              />
            </div>
            <Button type="submit">Create group</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current groups</CardTitle>
          <CardDescription>
            {groups.length === 0
              ? "No groups yet. Create one to get started."
              : `${groups.length} group${groups.length === 1 ? "" : "s"} with ${memberCount} total membership${memberCount === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Groups you create will appear here.</p>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <Card key={group.id} className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">{group.name}</CardTitle>
                    <CardDescription>
                      {group._count.members} member{group._count.members === 1 ? "" : "s"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Rename group</h3>
                      <form action={renameGroup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <input type="hidden" name="groupId" value={group.id} />
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-medium" htmlFor={`name-${group.id}`}>
                            Group name
                          </label>
                          <input
                            id={`name-${group.id}`}
                            name="name"
                            defaultValue={group.name}
                            required
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                        <Button type="submit">Save name</Button>
                      </form>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Import members</h3>
                      <ImportMembersForm groupId={group.id} action={importMembers} />
                    </div>

                    <form action={deleteGroup} className="flex justify-end">
                      <input type="hidden" name="groupId" value={group.id} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        Delete group
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
