import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AssignmentPage() {
  const session = await requireRole("ADMIN");
  const orgId = session.user?.orgId;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  const courses = await prisma.course.findMany({
    where: { orgId },
    include: { modules: true }
  });

  async function createAssignment(formData: FormData) {
    "use server";
    const courseId = formData.get("courseId")?.toString();
    const moduleId = formData.get("moduleId")?.toString() || null;
    const emails = formData.get("emails")?.toString() ?? "";

    if (!courseId) {
      throw new Error("Course is required");
    }

    const assignment = await prisma.assignment.create({
      data: {
        orgId,
        courseId,
        moduleId,
        createdBy: session.user!.id
      }
    });

    const inviteEmails = emails
      .split(/\n|,/) // split by newline or comma
      .map((email) => email.trim())
      .filter(Boolean);

    for (const email of inviteEmails) {
      await sendInviteEmail(email, `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/signin`);
    }

    return assignment.id;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create assignment</CardTitle>
          <CardDescription>Choose a course or module and invite learners via CSV or paste emails.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAssignment} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="courseId">
                Course
              </label>
              <select id="courseId" name="courseId" className="w-full rounded-md border p-2">
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="moduleId">
                Module (optional)
              </label>
              <select id="moduleId" name="moduleId" className="w-full rounded-md border p-2">
                <option value="">All modules</option>
                {courses.flatMap((course) =>
                  course.modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {course.title} — {module.title}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="emails">
                Invite emails (comma or newline separated)
              </label>
              <textarea id="emails" name="emails" rows={4} className="w-full rounded-md border p-2" placeholder="learner1@example.com, learner2@example.com" />
            </div>
            <Button type="submit">Create assignment</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
