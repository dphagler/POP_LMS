import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

const DEFAULT_ORG_NAME = "POP Initiative";

export async function getOrCreateUserForEmail(email: string, name?: string | null) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  const org = await prisma.organization.upsert({
    where: { name: DEFAULT_ORG_NAME },
    update: {},
    create: {
      name: DEFAULT_ORG_NAME
    }
  });

  const user = await prisma.user.create({
    data: {
      email,
      name,
      orgId: org.id,
      role: UserRole.LEARNER
    }
  });

  return user;
}
