import { notFound } from "next/navigation";

import { requireRole } from "@/lib/authz";
import { getOrgBranding, listOrgDomains } from "@/lib/db/org";

import { OrgSettingsClient } from "./org-settings-client";

export default async function OrgSettingsPage() {
  const session = await requireRole("ADMIN");
  const orgId = session.user.orgId;

  if (!orgId) {
    notFound();
  }

  const [branding, domains] = await Promise.all([
    getOrgBranding({ orgId }),
    listOrgDomains({ orgId }),
  ]);

  const serializedDomains = domains.map((domain) => ({
    id: domain.id,
    value: domain.value,
    createdAt: domain.createdAt.toISOString(),
    verifiedAt: domain.verifiedAt ? domain.verifiedAt.toISOString() : null,
  }));

  return (
    <OrgSettingsClient
      orgId={orgId}
      initialBranding={branding}
      initialDomains={serializedDomains}
    />
  );
}
