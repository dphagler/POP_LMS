import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { normalizeDomain } from "@/lib/domain-utils";
import { DEFAULT_ORG_NAME } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import {
  createOrgTheme,
  DEFAULT_LOGIN_BLURB,
  type OrgTheme,
  type OrgThemeMetadata
} from "@/lib/ui/theme";

export type OrgThemeSource = "domain" | "membership" | "default";

export type ResolvedOrgTheme = {
  theme: OrgTheme;
  source: OrgThemeSource;
  org: { id: string | null; name: string };
  shouldShowOrgBranding: boolean;
  host: string | null;
};

type OrgThemeRecord = {
  id: string;
  name: string;
  themePrimary: string | null;
  themeAccent: string | null;
  loginBlurb: string | null;
  logoUrl?: string | null;
};

const FALLBACK_ORG_NAME = DEFAULT_ORG_NAME ?? "POP Initiative";

const ORG_THEME_SELECT = {
  id: true,
  name: true,
  themePrimary: true,
  themeAccent: true,
  loginBlurb: true
} as const;

async function findOrgForVerifiedDomain(
  host: string
): Promise<OrgThemeRecord | null> {
  const record = await prisma.domain.findUnique({
    where: { value: host },
    select: {
      verifiedAt: true,
      org: {
        select: ORG_THEME_SELECT
      }
    }
  });

  if (!record?.verifiedAt || !record.org) {
    return null;
  }

  return {
    ...record.org
  } satisfies OrgThemeRecord;
}

async function findOrgForUser(
  userId: string,
  orgId: string | null | undefined
): Promise<OrgThemeRecord | null> {
  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: ORG_THEME_SELECT
    });

    if (org) {
      return { ...org } satisfies OrgThemeRecord;
    }
  }

  const membership = await prisma.orgMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      org: {
        select: ORG_THEME_SELECT
      }
    }
  });

  if (membership?.org) {
    return { ...membership.org } satisfies OrgThemeRecord;
  }

  return null;
}

export const resolveOrgTheme = cache(
  async function resolveOrgTheme(): Promise<ResolvedOrgTheme> {
    const headerList = await headers();
    const forwardedHost = headerList.get("x-forwarded-host");
    const hostHeader = forwardedHost ?? headerList.get("host");
    const hostWithoutPort = hostHeader?.split(":")[0] ?? null;
    const normalizedHost = hostWithoutPort
      ? normalizeDomain(hostWithoutPort)
      : null;

    let source: OrgThemeSource = "default";
    let orgRecord: OrgThemeRecord | null = null;

    if (normalizedHost) {
      const domainOrg = await findOrgForVerifiedDomain(normalizedHost);
      if (domainOrg) {
        orgRecord = domainOrg;
        source = "domain";
      }
    }

    if (!orgRecord) {
      const session = await auth();
      const sessionUser = session?.user as
        | { id?: string; orgId?: string | null }
        | undefined;
      if (sessionUser?.id) {
        const membershipOrg = await findOrgForUser(
          sessionUser.id,
          sessionUser.orgId ?? null
        );
        if (membershipOrg) {
          orgRecord = membershipOrg;
          source = "membership";
        }
      }
    }

    const org = orgRecord
      ? { id: orgRecord.id, name: orgRecord.name }
      : { id: null, name: FALLBACK_ORG_NAME };

    const theme = createOrgTheme({
      themePrimary: orgRecord?.themePrimary ?? null,
      themeAccent: orgRecord?.themeAccent ?? null,
      loginBlurb: orgRecord?.loginBlurb ?? DEFAULT_LOGIN_BLURB,
      logoUrl: orgRecord?.logoUrl ?? null,
      orgName: org.name
    });

    return {
      theme,
      source,
      org,
      shouldShowOrgBranding: source === "domain",
      host: normalizedHost
    } satisfies ResolvedOrgTheme;
  }
);

export function getThemeMetadata(theme: OrgTheme): OrgThemeMetadata {
  return theme.metadata;
}
