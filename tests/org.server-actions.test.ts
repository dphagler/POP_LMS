import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

import { buildDomainVerificationToken } from "@/lib/domain-utils";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://localhost:5432/test";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/db/org", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/org")>("@/lib/db/org");
  return {
    ...actual,
    updateOrgBranding: vi.fn(),
    createOrgDomain: vi.fn(),
    deleteOrgDomain: vi.fn(),
  };
});

let updateBrandingAction: typeof import("@/lib/server-actions/org").updateBranding;
let verifyDomainAction: typeof import("@/lib/server-actions/org").verifyDomain;
let removeDomainAction: typeof import("@/lib/server-actions/org").removeDomain;

let requireRoleMock: ReturnType<typeof vi.fn>;
let updateOrgBrandingMock: ReturnType<typeof vi.fn>;
let createOrgDomainMock: ReturnType<typeof vi.fn>;
let deleteOrgDomainMock: ReturnType<typeof vi.fn>;

const originalNodeEnv = process.env.NODE_ENV;
let fetchSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeEach(async () => {
  vi.resetModules();

  const actions = await import("@/lib/server-actions/org");
  updateBrandingAction = actions.updateBranding;
  verifyDomainAction = actions.verifyDomain;
  removeDomainAction = actions.removeDomain;

  const authz = await import("@/lib/authz");
  requireRoleMock = vi.mocked(authz.requireRole);

  const db = await import("@/lib/db/org");
  updateOrgBrandingMock = vi.mocked(db.updateOrgBranding);
  createOrgDomainMock = vi.mocked(db.createOrgDomain);
  deleteOrgDomainMock = vi.mocked(db.deleteOrgDomain);

  process.env.NODE_ENV = originalNodeEnv;
});

afterEach(() => {
  if (fetchSpy) {
    fetchSpy.mockRestore();
    fetchSpy = null;
  }

  vi.clearAllMocks();
  process.env.NODE_ENV = originalNodeEnv;
});

describe("org server actions", () => {
  it("updateBranding saves and returns values", async () => {
    requireRoleMock.mockResolvedValue({
      user: {
        id: "admin-1",
        orgId: "org-1",
      },
    } as any);

    updateOrgBrandingMock.mockResolvedValue({
      themePrimary: "#101010",
      themeAccent: "#202020",
      loginBlurb: "Hello!",
    });

    const result = await updateBrandingAction({
      themePrimary: "#101010",
      themeAccent: "#202020",
      loginBlurb: "Hello!",
    });

    expect(updateOrgBrandingMock).toHaveBeenCalledWith({
      orgId: "org-1",
      themePrimary: "#101010",
      themeAccent: "#202020",
      loginBlurb: "Hello!",
    });

    expect(result.ok).toBe(true);
    expect(result.branding).toEqual({
      themePrimary: "#101010",
      themeAccent: "#202020",
      loginBlurb: "Hello!",
    });
  });

  it("verifyDomain creates a domain when DNS contains the token", async () => {
    requireRoleMock.mockResolvedValue({
      user: {
        id: "admin-1",
        orgId: "org-1",
      },
    } as any);

    const now = new Date("2024-01-01T00:00:00.000Z");
    createOrgDomainMock.mockResolvedValue({
      id: "domain-1",
      value: "example.org",
      createdAt: now,
      verifiedAt: now,
    });

    process.env.NODE_ENV = "production";
    const token = buildDomainVerificationToken("org-1", "example.org");

    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        Answer: [{ data: `"${token}"` }],
      }),
    } as any);

    const result = await verifyDomainAction({ domain: "Example.org" });

    expect(createOrgDomainMock).toHaveBeenCalledWith({ orgId: "org-1", value: "example.org" });
    expect(result.ok).toBe(true);
    expect(result.domain).toEqual({
      id: "domain-1",
      value: "example.org",
      createdAt: now.toISOString(),
      verifiedAt: now.toISOString(),
    });
  });

  it("verifyDomain rejects when DNS is missing the token", async () => {
    requireRoleMock.mockResolvedValue({
      user: {
        id: "admin-1",
        orgId: "org-1",
      },
    } as any);

    process.env.NODE_ENV = "production";
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ Answer: [{ data: '"unrelated"' }] }),
    } as any);

    await expect(verifyDomainAction({ domain: "example.org" })).rejects.toThrow(
      /does not contain the verification token/i
    );
    expect(createOrgDomainMock).not.toHaveBeenCalled();
  });

  it("removeDomain deletes the record", async () => {
    requireRoleMock.mockResolvedValue({
      user: {
        id: "admin-1",
        orgId: "org-1",
      },
    } as any);

    const result = await removeDomainAction({ domainId: "domain-123" });

    expect(deleteOrgDomainMock).toHaveBeenCalledWith({ orgId: "org-1", domainId: "domain-123" });
    expect(result.ok).toBe(true);
    expect(result.domainId).toBe("domain-123");
  });
});
