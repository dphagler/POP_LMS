import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prisma } from "./prisma";

const DEFAULT_ORG_NAME = "POP Initiative";

type AddOrgDomainInput = {
  orgId: string;
  domain: string;
};

type RemoveOrgDomainInput = {
  orgId: string;
  id: string;
};

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

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

function assertValidDomain(domain: string) {
  if (!domain) {
    throw new Error("Domain is required");
  }

  if (!/^[a-z0-9.-]+$/u.test(domain)) {
    throw new Error("Domain contains invalid characters");
  }
}

export async function addOrgDomain({ orgId, domain }: AddOrgDomainInput) {
  const normalizedDomain = normalizeDomain(domain);
  assertValidDomain(normalizedDomain);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const orgDomain = await tx.orgDomain.create({
        data: {
          orgId,
          domain: normalizedDomain,
        },
      });

      await tx.auditLog.create({
        data: {
          orgId,
          action: "orgdomain.add",
          entity: "OrgDomain",
          entityId: orgDomain.id,
          meta: {
            domain: normalizedDomain,
          },
        },
      });

      return orgDomain;
    });

    return { id: created.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Domain already exists for this organization");
    }

    throw error;
  }
}

export async function removeOrgDomain({ orgId, id }: RemoveOrgDomainInput) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.orgDomain.findUnique({
      where: { id },
      select: {
        id: true,
        orgId: true,
        domain: true,
      },
    });

    if (!existing || existing.orgId !== orgId) {
      throw new Error("Organization domain not found");
    }

    await tx.orgDomain.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        orgId,
        action: "orgdomain.remove",
        entity: "OrgDomain",
        entityId: existing.id,
        meta: {
          domain: existing.domain,
        },
      },
    });

    return existing;
  });

  return { ok: true as const };
}

export async function resolveOrgByEmailDomain(email: string, client: PrismaClient = prisma) {
  const domainPart = email.split("@").pop();
  const normalizedDomain = domainPart ? normalizeDomain(domainPart) : "";

  if (!normalizedDomain) {
    return null;
  }

  try {
    assertValidDomain(normalizedDomain);
  } catch {
    return null;
  }

  const orgDomainDelegate = (client as { orgDomain?: PrismaClient["orgDomain"] | undefined }).orgDomain;

  if (!orgDomainDelegate || typeof orgDomainDelegate.findMany !== "function") {
    return null;
  }

  const results = await orgDomainDelegate.findMany({
    where: { domain: normalizedDomain },
    select: { orgId: true },
  });

  const uniqueOrgIds = new Set(results.map((result) => result.orgId));

  if (uniqueOrgIds.size === 0) {
    return null;
  }

  if (uniqueOrgIds.size === 1) {
    return uniqueOrgIds.values().next().value ?? null;
  }

  return "ambiguous" as const;
}
