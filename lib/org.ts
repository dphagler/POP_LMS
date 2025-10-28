import type { PrismaClient } from "@prisma/client";
import { normalizeDomain, assertValidDomain } from "./domain-utils";
import { prisma } from "./prisma";

export const DEFAULT_ORG_NAME = "POP Initiative";

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

export async function getOrCreateDefaultOrg(client: PrismaClient = prisma) {
  const existing = await client.organization.findFirst({
    where: { name: DEFAULT_ORG_NAME },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  const created = await client.organization.create({
    data: { name: DEFAULT_ORG_NAME },
    select: { id: true },
  });

  return created;
}

export async function findOrgIdForDomain(domain: string, client: PrismaClient = prisma) {
  const normalizedDomain = normalizeDomain(domain);

  try {
    assertValidDomain(normalizedDomain);
  } catch {
    return null;
  }

  const domainDelegate = (client as { domain?: PrismaClient["domain"] | undefined }).domain;

  if (!domainDelegate || typeof domainDelegate.findUnique !== "function") {
    return null;
  }

  const record = await domainDelegate.findUnique({
    where: { value: normalizedDomain },
    select: { orgId: true },
  });

  return record?.orgId ?? null;
}

export async function getDefaultOrgForEmail(email: string, client: PrismaClient = prisma) {
  const candidate = email.split("@").pop();
  if (!candidate) {
    return null;
  }

  return findOrgIdForDomain(candidate, client);
}
