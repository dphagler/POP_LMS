import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: pnpm ts-node scripts/promote-admin.ts <email>");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });

    console.log(`Promoted ${user.email} to ADMIN.`);
  } catch (error) {
    console.error("Failed to promote user:", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
