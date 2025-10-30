"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/authz";
import { env } from "@/lib/env";
import {
  assertValidDomain,
  buildDomainVerificationToken,
  getDomainVerificationRecordName,
  normalizeDomain,
} from "@/lib/domain-utils";
import {
  createOrgDomain,
  deleteOrgDomain,
  updateOrgBranding,
} from "@/lib/db/org";
import { logAudit } from "@/lib/db/audit";

type SerializableDomainRecord = {
  id: string;
  value: string;
  createdAt: string;
  verifiedAt: string | null;
};

const BRANDING_PATH = "/admin/org";

const HexColorSchema = z
  .string()
  .trim()
  .max(7, "Use a valid hex color (e.g. #1F2937)")
  .transform((value) => value.toLowerCase())
  .refine((value) => value.length === 0 || /^#(?:[0-9a-f]{3}){1,2}$/u.test(value), {
    message: "Use a valid hex color (e.g. #1F2937)",
  })
  .transform((value) => (value.length === 0 ? null : value));

const BrandingPayloadSchema = z.object({
  themePrimary: HexColorSchema,
  themeAccent: HexColorSchema,
  loginBlurb: z
    .string()
    .trim()
    .max(500, "Login blurb must be 500 characters or fewer")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

const DomainInputSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, "Domain is required")
    .refine((value) => {
      try {
        assertValidDomain(value);
        return true;
      } catch {
        return false;
      }
    }, "Enter a valid domain")
    .transform((value) => normalizeDomain(value)),
});

async function requireAdminOrgContext() {
  const session = await requireRole("ADMIN");
  const orgId = session.user.orgId;

  if (!orgId) {
    throw new Error("Organization not found for admin user");
  }

  return { orgId, userId: session.user.id };
}

function shouldSkipDnsVerification() {
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}

async function verifyDomainOwnership({
  domain,
  token,
}: {
  domain: string;
  token: string;
}) {
  if (shouldSkipDnsVerification()) {
    return true;
  }

  const fqdn = getDomainVerificationRecordName(domain);
  const response = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(fqdn)}&type=TXT`,
    {
      headers: {
        accept: "application/dns-json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`DNS lookup failed for ${fqdn}`);
  }

  const payload = (await response.json()) as { Answer?: Array<{ data: string }> };
  const answers = payload.Answer ?? [];
  const matchesToken = answers.some((answer) => answer.data.replace(/"/g, "").includes(token));

  if (!matchesToken) {
    throw new Error(
      `TXT record for ${fqdn} does not contain the verification token for this organization`
    );
  }

  return true;
}

export async function updateBranding(input: {
  themePrimary: string;
  themeAccent: string;
  loginBlurb?: string | null;
}) {
  const { orgId, userId } = await requireAdminOrgContext();
  const payload = BrandingPayloadSchema.parse(input);

  const branding = await updateOrgBranding({
    orgId,
    themePrimary: payload.themePrimary,
    themeAccent: payload.themeAccent,
    loginBlurb: payload.loginBlurb ?? null,
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "branding.update",
    targetId: orgId,
    metadata: {
      themePrimary: branding.themePrimary,
      themeAccent: branding.themeAccent,
      loginBlurb: branding.loginBlurb,
    },
  });

  await revalidatePath(BRANDING_PATH);

  return { ok: true as const, branding };
}

export async function verifyDomain(input: { domain: string }): Promise<{
  ok: true;
  domain: SerializableDomainRecord;
}> {
  const { orgId, userId } = await requireAdminOrgContext();
  const payload = DomainInputSchema.parse(input);
  const token = buildDomainVerificationToken(orgId, payload.domain);

  await verifyDomainOwnership({ domain: payload.domain, token });

  const domain = await createOrgDomain({ orgId, value: payload.domain });

  await logAudit({
    orgId,
    actorId: userId,
    action: "domain.verify",
    targetId: domain.id,
    metadata: {
      domain: domain.value,
      verifiedAt: domain.verifiedAt?.toISOString() ?? null,
    },
  });

  await revalidatePath(BRANDING_PATH);

  return {
    ok: true as const,
    domain: {
      id: domain.id,
      value: domain.value,
      createdAt: domain.createdAt.toISOString(),
      verifiedAt: domain.verifiedAt ? domain.verifiedAt.toISOString() : null,
    },
  };
}

export async function removeDomain(input: { domainId: string }) {
  const { orgId } = await requireAdminOrgContext();
  const parsed = z
    .object({ domainId: z.string().trim().min(1, "Domain id is required") })
    .parse(input);

  await deleteOrgDomain({ orgId, domainId: parsed.domainId });

  await revalidatePath(BRANDING_PATH);

  return { ok: true as const, domainId: parsed.domainId };
}

