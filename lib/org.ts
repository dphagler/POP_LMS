import { prisma } from "./prisma";

const DEFAULT_ORG_NAME = "POP Initiative";

export async function resolveOrgName(orgId: string | null | undefined) {
  if (!orgId) {
    return DEFAULT_ORG_NAME;
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true },
  });

  return organization?.name ?? DEFAULT_ORG_NAME;
}
