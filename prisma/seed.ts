import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const POP_INITIATIVE_ID = "pop-initiative";

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: POP_INITIATIVE_ID },
    update: {
      name: "POP Initiative",
      themeJson: {
        primary: "222.2 47.4% 11.2%",
        "primary-foreground": "210 40% 98%"
      }
    },
    create: {
      id: POP_INITIATIVE_ID,
      name: "POP Initiative",
      themeJson: {
        primary: "222.2 47.4% 11.2%",
        "primary-foreground": "210 40% 98%"
      }
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@poplms.dev" },
    update: {
      orgId: organization.id,
      role: UserRole.ADMIN
    },
    create: {
      email: "admin@poplms.dev",
      name: "POP Admin",
      orgId: organization.id,
      role: UserRole.ADMIN
    }
  });

  console.log(
    `Seed complete. Organization "${organization.name}" available with admin ${admin.email}.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
