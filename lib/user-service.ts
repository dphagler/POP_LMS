import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

const DEFAULT_ORG_NAME = "POP Initiative";

type UserProfile = {
  name?: string | null;
  image?: string | null;
};

type PrismaClientLike = typeof prisma;

export async function getOrCreateUserForEmail(
  email: string,
  profile?: UserProfile,
  client: PrismaClientLike = prisma
) {
  const { name, image } = profile ?? {};

  const existing = await client.user.findUnique({ where: { email } });
  if (existing) {
    const data: { name?: string | null; image?: string | null } = {};

    if (typeof name !== "undefined" && existing.name !== name) {
      data.name = name;
    }

    if (typeof image !== "undefined" && existing.image !== image) {
      data.image = image;
    }

    if (Object.keys(data).length > 0) {
      return client.user.update({
        where: { id: existing.id },
        data,
      });
    }

    return existing;
  }

  let org = await client.organization.findFirst({
    where: { name: DEFAULT_ORG_NAME },
  });

  if (!org) {
    org = await client.organization.create({
      data: {
        name: DEFAULT_ORG_NAME,
      },
    });
  }

  const data: {
    email: string;
    name?: string | null;
    image?: string | null;
    orgId: string;
    role: UserRole;
  } = {
    email,
    orgId: org.id,
    role: UserRole.LEARNER,
  };

  if (typeof name !== "undefined") {
    data.name = name;
  }

  if (typeof image !== "undefined") {
    data.image = image;
  }

  return client.user.create({
    data,
  });
}
