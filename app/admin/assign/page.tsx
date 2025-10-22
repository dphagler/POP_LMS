import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import AssignmentPlanner from "./assignment-planner";

export default async function AssignmentPage() {
  const session = await requireRole("ADMIN");
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
    prisma.assignment.findMany({
      where: { orgId },
      include: {
        enrollments: {
          select: { userId: true }
        }
      }
    })
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

  const assignmentOptions = assignments.map((assignment) => ({
    id: assignment.id,
    courseId: assignment.courseId,
    moduleId: assignment.moduleId,
    enrollments: assignment.enrollments
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" asChild className="w-fit px-0 text-muted-foreground hover:text-foreground">
          <Link href="/admin">← Back to admin</Link>
        </Button>
        <h1 className="text-3xl font-semibold">Assign learning</h1>
        <p className="text-sm text-muted-foreground">
          Assign courses or individual modules to learner groups with a preview of exactly who will be enrolled.
        </p>
      </div>

      <AssignmentPlanner courses={courseOptions} groups={groupOptions} assignments={assignmentOptions} />
    </div>
  );
}
