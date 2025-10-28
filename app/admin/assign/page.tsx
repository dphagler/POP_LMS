import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeader } from "@/components/admin/PageHeader";
import { requireAdminAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Button as ChakraButton } from "@chakra-ui/react";
import { Button as UiButton } from "@/components/ui/button";
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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PageHeader
          title="Assignments"
          subtitle="Assign courses or individual modules to learner groups with a preview of who will be enrolled."
          actions={
            <ChakraButton as={Link} href="#assignment-planner" colorScheme="primary">
              New assignment
            </ChakraButton>
          }
        />

        <Card>
          <CardHeader className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Plan assignments</CardTitle>
              <CardDescription className="prose prose-sm text-muted-foreground max-w-none">
                Create assignments, preview enrollment lists, and keep everyone aligned with the latest learning paths.
              </CardDescription>
            </div>
            <UiButton as={Link} href="/admin/groups" variant="outline" className="sm:w-auto">
              Manage groups
            </UiButton>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Use the planner below to build new assignments or update due dates in bulk.
            </p>
          </CardContent>
        </Card>

        <div id="assignment-planner">
          <AssignmentPlanner courses={courseOptions} groups={groupOptions} assignments={assignments} />
        </div>
      </div>
    </AdminShell>
  );
}
