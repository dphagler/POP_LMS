import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AssignmentPlanner from "./assignment-planner";
import { listAssignmentsForOrg } from "@/lib/db/assignment";

export default async function AssignmentPage() {
  const { session } = await requireAdminAccess(["ADMIN", "MANAGER"]);
  const { orgId } = session.user;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const [courses, groups, assignments] = await Promise.all([
    prisma.course.findMany({
      where: { orgId },
      orderBy: { title: "asc" },
      include: {
        modules: {
          orderBy: { order: "asc" },
          select: { id: true, title: true }
        }
      }
    }),
    prisma.orgGroup.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      include: {
        members: {
          orderBy: { user: { name: "asc" } },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    }),
    listAssignmentsForOrg(orgId)
  ]);

  const courseOptions = courses.map((course) => ({
    id: course.id,
    title: course.title,
    modules: course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      courseId: course.id,
      courseTitle: course.title
    }))
  }));

  const groupOptions = groups.map((group) => ({
    id: group.id,
    name: group.name,
    members: group.members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email
    }))
  }));

  return (
    <AdminShell title="Assignments" breadcrumb={[{ label: "Assignments" }]}> 
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Assign learning</CardTitle>
              <CardDescription className="prose prose-sm text-muted-foreground max-w-none">
                Assign courses or individual modules to learner groups with a preview of exactly who will be enrolled.
              </CardDescription>
            </div>
            <Button as={Link} href="/admin/groups" variant="outline" className="sm:w-auto">
              Manage groups
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Create assignments, preview enrollment lists, and keep everyone aligned with the latest learning paths.
            </p>
          </CardContent>
        </Card>

        <AssignmentPlanner courses={courseOptions} groups={groupOptions} assignments={assignments} />
      </div>
    </AdminShell>
  );
}
