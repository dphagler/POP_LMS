import { Prisma } from "@prisma/client";

import { assertValidDomain, normalizeDomain } from "@/lib/domain-utils";
import { prisma } from "@/lib/prisma";

export type OrgBranding = {
  themePrimary: string | null;
  themeAccent: string | null;
  loginBlurb: string | null;
};

export async function getOrgBranding({ orgId }: { orgId: string }): Promise<OrgBranding> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      themePrimary: true,
      themeAccent: true,
      loginBlurb: true,
    },
  });

  return {
    themePrimary: org?.themePrimary ?? null,
    themeAccent: org?.themeAccent ?? null,
    loginBlurb: org?.loginBlurb ?? null,
  };
}

export async function updateOrgBranding({
  orgId,
  themePrimary,
  themeAccent,
  loginBlurb,
}: {
  orgId: string;
  themePrimary: string | null;
  themeAccent: string | null;
  loginBlurb: string | null;
}): Promise<OrgBranding> {
  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      themePrimary,
      themeAccent,
      loginBlurb,
    },
    select: {
      themePrimary: true,
      themeAccent: true,
      loginBlurb: true,
    },
  });

  return {
    themePrimary: updated.themePrimary,
    themeAccent: updated.themeAccent,
    loginBlurb: updated.loginBlurb,
  };
}

export type OrgDomainRecord = {
  id: string;
  value: string;
  createdAt: Date;
  verifiedAt: Date | null;
};

const domainSelect = {
  id: true,
  value: true,
  createdAt: true,
  verifiedAt: true,
} satisfies Record<string, boolean>;

export async function listOrgDomains({ orgId }: { orgId: string }): Promise<OrgDomainRecord[]> {
  const domains = await prisma.domain.findMany({
    where: { orgId },
    orderBy: { value: "asc" },
    select: domainSelect,
  });

  return domains.map((domain) => ({
    id: domain.id,
    value: domain.value,
    createdAt: domain.createdAt,
    verifiedAt: domain.verifiedAt,
  }));
}

export async function createOrgDomain({
  orgId,
  value,
}: {
  orgId: string;
  value: string;
}): Promise<OrgDomainRecord> {
  const normalized = normalizeDomain(value);
  assertValidDomain(normalized);

  try {
    const domain = await prisma.domain.create({
      data: {
        orgId,
        value: normalized,
        verifiedAt: new Date(),
      },
      select: domainSelect,
    });

    return domain;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Domain is already verified for an organization");
    }

    throw error;
  }
}

export async function deleteOrgDomain({
  orgId,
  domainId,
}: {
  orgId: string;
  domainId: string;
}): Promise<void> {
  const existing = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { id: true, orgId: true },
  });

  if (!existing || existing.orgId !== orgId) {
    throw new Error("Domain not found for organization");
  }

  await prisma.domain.delete({ where: { id: domainId } });
}
