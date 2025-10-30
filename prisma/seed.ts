import { PrismaClient, QuestionType, UserRole, OrgRole, EnrollmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organizationId = "org-demo";
  const adminEmail = "admin@example.com";
  const learnerEmail = "learner@example.com";

  const organization = await prisma.organization.upsert({
    where: { id: organizationId },
    update: {
      name: "Demo Academy",
      themePrimary: "#1f2937",
      themeAccent: "#f97316",
      loginBlurb: "Welcome back to Demo Academy."
    },
    create: {
      id: organizationId,
      name: "Demo Academy",
      themePrimary: "#1f2937",
      themeAccent: "#f97316",
      loginBlurb: "Welcome back to Demo Academy."
    }
  });

  await prisma.domain.upsert({
    where: { value: "demo.example" },
    update: { orgId: organization.id, verifiedAt: new Date("2024-01-01T00:00:00.000Z") },
    create: {
      orgId: organization.id,
      value: "demo.example",
      verifiedAt: new Date("2024-01-01T00:00:00.000Z")
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Demo Admin",
      orgId: organization.id,
      role: UserRole.ADMIN
    },
    create: {
      email: adminEmail,
      name: "Demo Admin",
      orgId: organization.id,
      role: UserRole.ADMIN
    }
  });

  const learner = await prisma.user.upsert({
    where: { email: learnerEmail },
    update: {
      name: "Demo Learner",
      orgId: organization.id,
      role: UserRole.LEARNER
    },
    create: {
      email: learnerEmail,
      name: "Demo Learner",
      orgId: organization.id,
      role: UserRole.LEARNER
    }
  });

  await prisma.orgMembership.upsert({
    where: {
      userId_orgId: { userId: admin.id, orgId: organization.id }
    },
    update: { role: OrgRole.ADMIN },
    create: { userId: admin.id, orgId: organization.id, role: OrgRole.ADMIN }
  });

  await prisma.orgMembership.upsert({
    where: {
      userId_orgId: { userId: learner.id, orgId: organization.id }
    },
    update: { role: OrgRole.LEARNER },
    create: { userId: learner.id, orgId: organization.id, role: OrgRole.LEARNER }
  });

  const engineeringGroup = await prisma.orgGroup.upsert({
    where: { id: "group-engineering" },
    update: {
      name: "Engineering Cohort",
      orgId: organization.id
    },
    create: {
      id: "group-engineering",
      name: "Engineering Cohort",
      orgId: organization.id
    }
  });

  await prisma.orgGroup.upsert({
    where: { id: "group-operations" },
    update: {
      name: "Operations Cohort",
      orgId: organization.id
    },
    create: {
      id: "group-operations",
      name: "Operations Cohort",
      orgId: organization.id
    }
  });

  await prisma.groupMember.upsert({
    where: {
      groupId_userId: { groupId: engineeringGroup.id, userId: learner.id }
    },
    update: {},
    create: {
      groupId: engineeringGroup.id,
      userId: learner.id
    }
  });

  const course = await prisma.course.upsert({
    where: { id: "course-onboarding" },
    update: {
      orgId: organization.id,
      title: "Onboarding Essentials",
      description: "A short introduction to the Demo Academy platform."
    },
    create: {
      id: "course-onboarding",
      orgId: organization.id,
      title: "Onboarding Essentials",
      description: "A short introduction to the Demo Academy platform."
    }
  });

  const module = await prisma.module.upsert({
    where: { id: "module-welcome" },
    update: {
      courseId: course.id,
      title: "Welcome Module",
      order: 1
    },
    create: {
      id: "module-welcome",
      courseId: course.id,
      title: "Welcome Module",
      order: 1
    }
  });

  const introLesson = await prisma.lesson.upsert({
    where: { id: "lesson-intro" },
    update: {
      moduleId: module.id,
      title: "Platform Walkthrough",
      provider: "youtube",
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
      posterUrl: null,
      durationS: 240,
      requiresFullWatch: true
    },
    create: {
      id: "lesson-intro",
      moduleId: module.id,
      title: "Platform Walkthrough",
      provider: "youtube",
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
      posterUrl: null,
      durationS: 240,
      requiresFullWatch: true
    }
  });

  const policyLesson = await prisma.lesson.upsert({
    where: { id: "lesson-policy" },
    update: {
      moduleId: module.id,
      title: "Team Policies",
      streamId: "demo-stream-id",
      provider: "cloudflare",
      videoUrl: null,
      posterUrl: null,
      durationS: 300,
      requiresFullWatch: true
    },
    create: {
      id: "lesson-policy",
      moduleId: module.id,
      title: "Team Policies",
      streamId: "demo-stream-id",
      provider: "cloudflare",
      videoUrl: null,
      posterUrl: null,
      durationS: 300,
      requiresFullWatch: true
    }
  });

  const quiz = await prisma.quiz.upsert({
    where: { lessonId: policyLesson.id },
    update: {},
    create: { lessonId: policyLesson.id }
  });

  await prisma.quizQuestion.upsert({
    where: { id: "question-policy-1" },
    update: {
      quizId: quiz.id,
      type: QuestionType.MCQ,
      prompt: "Which channel should you use for urgent incidents?",
      options: [
        { key: "slack", label: "Slack #incidents" },
        { key: "email", label: "Email leadership" },
        { key: "pager", label: "Pager rotation" }
      ],
      correctKey: "pager"
    },
    create: {
      id: "question-policy-1",
      quizId: quiz.id,
      type: QuestionType.MCQ,
      prompt: "Which channel should you use for urgent incidents?",
      options: [
        { key: "slack", label: "Slack #incidents" },
        { key: "email", label: "Email leadership" },
        { key: "pager", label: "Pager rotation" }
      ],
      correctKey: "pager"
    }
  });

  const assignment = await prisma.assignment.upsert({
    where: { id: "assignment-onboarding" },
    update: {
      orgId: organization.id,
      groupId: engineeringGroup.id,
      courseId: course.id,
      moduleId: module.id,
      label: "Onboarding Assignment",
      dueAt: new Date("2024-02-01T00:00:00.000Z")
    },
    create: {
      id: "assignment-onboarding",
      orgId: organization.id,
      groupId: engineeringGroup.id,
      courseId: course.id,
      moduleId: module.id,
      label: "Onboarding Assignment",
      dueAt: new Date("2024-02-01T00:00:00.000Z"),
      createdBy: admin.id
    }
  });

  await prisma.enrollment.upsert({
    where: {
      assignmentId_userId: { assignmentId: assignment.id, userId: learner.id }
    },
    update: { status: EnrollmentStatus.ACTIVE },
    create: {
      assignmentId: assignment.id,
      userId: learner.id,
      status: EnrollmentStatus.ACTIVE
    }
  });

  await prisma.progress.upsert({
    where: {
      userId_lessonId: { userId: learner.id, lessonId: introLesson.id }
    },
    update: {
      org: { connect: { id: organization.id } },
      segments: [[0, 230]],
      uniqueSeconds: 230,
      lastTickAt: new Date("2024-01-10T10:00:00.000Z"),
      completedAt: new Date("2024-01-10T10:05:00.000Z")
    },
    create: {
      orgId: organization.id,
      userId: learner.id,
      lessonId: introLesson.id,
      segments: [[0, 230]],
      uniqueSeconds: 230,
      lastTickAt: new Date("2024-01-10T10:00:00.000Z"),
      completedAt: new Date("2024-01-10T10:05:00.000Z")
    }
  });

  await prisma.progress.upsert({
    where: {
      userId_lessonId: { userId: learner.id, lessonId: policyLesson.id }
    },
    update: {
      org: { connect: { id: organization.id } },
      segments: [[0, 140]],
      uniqueSeconds: 140,
      lastTickAt: new Date("2024-01-12T12:30:00.000Z"),
      completedAt: null
    },
    create: {
      orgId: organization.id,
      userId: learner.id,
      lessonId: policyLesson.id,
      segments: [[0, 140]],
      uniqueSeconds: 140,
      lastTickAt: new Date("2024-01-12T12:30:00.000Z"),
      completedAt: null
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
