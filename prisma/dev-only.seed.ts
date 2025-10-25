/**
 * DEV-ONLY SEED SCRIPT.
 *
 * This script is intended solely for local development and must never run in production.
 */
import { OrgRole, PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const DEV_ORG_ID = "dev-only-local-org";

if (process.env.NODE_ENV === "production") {
  throw new Error(
    "dev-only.seed.ts attempted to run with NODE_ENV=production. This script must never run in production."
  );
}

async function createUserWithMembership({
  email,
  name,
  userRole,
  orgRole
}: {
  email: string;
  name: string;
  userRole: UserRole;
  orgRole: OrgRole;
}) {
  const user = await prisma.user.create({
    data: {
      email,
      name,
      orgId: DEV_ORG_ID,
      role: userRole
    }
  });

  await prisma.orgMembership.create({
    data: {
      userId: user.id,
      orgId: DEV_ORG_ID,
      role: orgRole
    }
  });

  return user;
}

async function main() {
  console.warn("\n⚠️  Running DEV-ONLY seed script. Do not use in production.\n");

  await prisma.organization
    .delete({
      where: { id: DEV_ORG_ID }
    })
    .catch(() => undefined);

  const organization = await prisma.organization.create({
    data: {
      id: DEV_ORG_ID,
      name: "Local Development Org",
      themeJson: {
        primary: "215 25% 25%",
        "primary-foreground": "0 0% 100%"
      }
    }
  });

  await prisma.orgDomain.createMany({
    data: [
      { orgId: organization.id, domain: "localdev.test" },
      { orgId: organization.id, domain: "sandbox.local" }
    ]
  });

  const owner = await createUserWithMembership({
    email: "owner@localdev.test",
    name: "Dev Owner",
    userRole: UserRole.ADMIN,
    orgRole: OrgRole.OWNER
  });

  const admin = await createUserWithMembership({
    email: "admin@localdev.test",
    name: "Dev Admin",
    userRole: UserRole.ADMIN,
    orgRole: OrgRole.ADMIN
  });

  const instructors = await Promise.all(
    [1, 2].map((index) =>
      createUserWithMembership({
        email: `instructor${index}@localdev.test`,
        name: `Dev Instructor ${index}`,
        userRole: UserRole.INSTRUCTOR,
        orgRole: OrgRole.INSTRUCTOR
      })
    )
  );

  const learners = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      createUserWithMembership({
        email: `learner${index + 1}@localdev.test`,
        name: `Dev Learner ${index + 1}`,
        userRole: UserRole.LEARNER,
        orgRole: OrgRole.LEARNER
      })
    )
  );

  const [groupAlpha, groupBeta] = await Promise.all([
    prisma.orgGroup.create({
      data: { orgId: organization.id, name: "Cohort Alpha" }
    }),
    prisma.orgGroup.create({
      data: { orgId: organization.id, name: "Cohort Beta" }
    })
  ]);

  await Promise.all(
    learners.map((learner, index) =>
      prisma.groupMember.create({
        data: {
          userId: learner.id,
          groupId: index < 5 ? groupAlpha.id : groupBeta.id
        }
      })
    )
  );

  console.log("Dev seed complete.");
  console.table([
    { role: "Owner", email: owner.email },
    { role: "Admin", email: admin.email },
    ...instructors.map((instructor, index) => ({
      role: `Instructor ${index + 1}`,
      email: instructor.email
    })),
    ...learners.map((learner, index) => ({
      role: `Learner ${index + 1}`,
      email: learner.email
    }))
  ]);
}

main()
  .catch((error) => {
    console.error("Dev seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
