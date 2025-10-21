import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "seed-org" },
    update: {},
    create: {
      id: "seed-org",
      name: "POP Initiative",
      themeJson: {
        primary: "222.2 47.4% 11.2%",
        "primary-foreground": "210 40% 98%"
      }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@poplms.dev" },
    update: { orgId: org.id, role: UserRole.ADMIN },
    create: {
      email: "admin@poplms.dev",
      name: "POP Admin",
      orgId: org.id,
      role: UserRole.ADMIN
    }
  });

  const course = await prisma.course.upsert({
    where: { id: "seed-course" },
    update: {},
    create: {
      id: "seed-course",
      orgId: org.id,
      title: "Welcome to POP LMS",
      description: "Learn how to use the POP LMS starter effectively"
    }
  });

  const module = await prisma.module.upsert({
    where: { id: "seed-module" },
    update: {},
    create: {
      id: "seed-module",
      courseId: course.id,
      title: "Getting Started",
      order: 1
    }
  });

  await prisma.lesson.upsert({
    where: { id: "seed-lesson" },
    update: {},
    create: {
      id: "seed-lesson",
      moduleId: module.id,
      title: "Heartbeat Tracking Overview",
      youtubeId: "dQw4w9WgXcQ",
      durationS: 212,
      requiresFullWatch: true
    }
  });

  console.log(`Seed complete. Admin user: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
