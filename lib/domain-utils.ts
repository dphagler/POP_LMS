const DOMAIN_PATTERN = /^[a-z0-9.-]+$/u;

export function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

export function assertValidDomain(domain: string) {
  const normalized = normalizeDomain(domain);

  if (!normalized) {
    throw new Error("Domain is required");
  }

  if (!DOMAIN_PATTERN.test(normalized)) {
    throw new Error("Domain contains invalid characters");
  }
}

function computeHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildDomainVerificationToken(orgId: string, domain: string) {
  const normalized = normalizeDomain(domain);
  const hash = computeHash(`${orgId}:${normalized}`);
  return `org_${orgId}_${hash}`;
}

export function getDomainVerificationRecordName(domain: string) {
  return `_poplms.${normalizeDomain(domain)}`;
}
