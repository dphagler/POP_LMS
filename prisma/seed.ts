import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Wipe tables in order (idempotent dev seed)
  await prisma.$transaction([
    prisma.augmentationMessage?.deleteMany?.(),
    prisma.augmentationServed?.deleteMany?.(),
    prisma.progress.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.groupMember.deleteMany(),
    prisma.group.deleteMany(),
    prisma.domain?.deleteMany?.(),
    prisma.user.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.module.deleteMany(),
    prisma.course.deleteMany(),
    prisma.organization.deleteMany(),
  ].filter(Boolean) as any);

  // Org
  const org = await prisma.organization.create({
    data: { name: process.env.DEFAULT_ORG_NAME || "POP Initiative" },
  });

  // Admin user
  const admin = await prisma.user.create({
    data: {
      orgId: org.id,
      email: "admin@example.com",
      name: "POP Admin",
      role: "ADMIN",
      source: "invite",
    },
  });

  // Group
  const group = await prisma.group.create({
    data: { orgId: org.id, name: "Alpha Group" },
  });
  await prisma.groupMember.create({
    data: { orgId: org.id, groupId: group.id, userId: admin.id, groupManager: true },
  });

  // Course / Module
  const course = await prisma.course.create({
    data: { orgId: org.id, title: "Essential Skills Starter" },
  });
  const mod = await prisma.module.create({
    data: { orgId: org.id, courseId: course.id, title: "Communication Basics" },
  });

  // Lessons (YouTube-first)
  const lessons = await prisma.$transaction([
    prisma.lesson.create({
      data: {
        orgId: org.id,
        moduleId: mod.id,
        title: "Effective Listening",
        provider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
        durationS: 90,
        requiresFullWatch: true,
      },
    }),
    prisma.lesson.create({
      data: {
        orgId: org.id,
        moduleId: mod.id,
        title: "Clear Messaging",
        provider: "youtube",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        durationS: 75,
        requiresFullWatch: true,
      },
    }),
    prisma.lesson.create({
      data: {
        orgId: org.id,
        moduleId: mod.id,
        title: "Nonverbal Cues (Cloudflare later)",
        provider: "cloudflare",
        streamId: null, // fill when you enable Cloudflare
        durationS: 60,
        requiresFullWatch: false,
      },
    }),
  ]);

  // Assignment → Enrollment for group
  const assignment = await prisma.assignment.create({
    data: {
      orgId: org.id,
      groupId: group.id,
      moduleId: mod.id,
      label: "Week 1",
      dueAt: null,
      createdBy: admin.id,
    },
  });
  for (const l of lessons) {
    await prisma.enrollment.upsert({
      where: { userId_moduleId_orgId: { userId: admin.id, moduleId: mod.id, orgId: org.id } },
      create: { userId: admin.id, moduleId: mod.id, orgId: org.id },
      update: {},
    });
  }

  // Optional: tiny Progress starter row so analytics isn’t empty
  await prisma.progress.create({
    data: {
      orgId: org.id,
      userId: admin.id,
      lessonId: lessons[0].id,
      segments: [],
      uniqueSeconds: 0,
    },
  });

  console.log("Seeded:", {
    org: org.name,
    admin: admin.email,
    course: course.title,
    module: mod.title,
    lessons: lessons.map(l => ({ id: l.id, title: l.title, provider: l.provider })),
    assignment: assignment.id,
  });
}

main().finally(() => prisma.$disconnect());
