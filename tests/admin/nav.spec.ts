import { test as base, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import type { Page } from "@playwright/test";
import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const COOKIE_DOMAIN = new URL(BASE_URL).hostname;
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const SESSION_COOKIE_NAMES = ["authjs.session-token", "next-auth.session-token"] as const;

const test = base.extend<{
  adminUser: TestUser;
  managerUser: TestUser;
  loginAs: (user: TestUser) => Promise<void>;
}>({
  adminUser: async ({}, use) => {
    const user = await resolveTestUser("admin@poplms.dev");
    await use(user);
  },
  managerUser: async ({}, use) => {
    const user = await resolveTestUser("instructor@poplms.dev");
    await use(user);
  },
  loginAs: async ({ page }, use) => {
    async function loginAs(user: TestUser) {
      await applySession(page, user);
    }

    await use(loginAs);
    await page.context().clearCookies();
  }
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

type TestUser = {
  id: string;
  email: string;
  name: string | null;
  orgId: string | null;
  role: UserRole;
};

async function resolveTestUser(email: string): Promise<TestUser> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, orgId: true, role: true }
  });

  if (!user) {
    throw new Error(`Test user ${email} is missing. Run the Prisma seed before executing Playwright tests.`);
  }

  return user;
}

async function applySession(page: Page, user: TestUser) {
  const secret = env.NEXTAUTH_SECRET ?? "development_secret";

  const token = await encode({
    secret,
    salt: secret,
    token: {
      name: user.name ?? undefined,
      email: user.email,
      sub: user.id,
      orgId: user.orgId,
      role: user.role
    },
    maxAge: SESSION_MAX_AGE
  });

  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;

  const cookies = SESSION_COOKIE_NAMES.map((name) => ({
    name,
    value: token,
    domain: COOKIE_DOMAIN,
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
    expires
  }));

  await page.context().addCookies(cookies);
}

function navTestId(href: string): string {
  const slug = href.replace(/^\/+/, "").replace(/\//g, "-") || "root";
  return `admin-sidebar-link-${slug}`;
}

test.describe("admin navigation smoke", () => {
  test("admin sidebar links navigate to core destinations", async ({ page, adminUser, loginAs }) => {
    await loginAs(adminUser);
    await page.goto("/admin");

    const destinations = [
      { href: "/admin", label: "Dashboard", heading: "Dashboard" },
      { href: "/admin/users", label: "Users", heading: "Users" },
      { href: "/admin/groups", label: "Groups", heading: "Groups" },
      { href: "/admin/assign", label: "Assignments", heading: "Assignments" },
      { href: "/admin/org", label: "Org Settings", heading: "Org Settings" },
      { href: "/admin/audit", label: "Audit", heading: "Audit" },
      { href: "/admin/analytics", label: "Analytics", heading: "Analytics" }
    ];

    for (const destination of destinations) {
      const navLink = page.getByTestId(navTestId(destination.href));
      await expect(navLink, `Expected sidebar link for ${destination.label}`).toBeVisible();
      await expect(navLink).toHaveText(destination.label);

      const currentPath = new URL(page.url()).pathname;
      if (currentPath === destination.href) {
        await navLink.click();
      } else {
        const waitForUrl = page.waitForURL((url) => url.pathname === destination.href);
        await navLink.click();
        await waitForUrl;
      }

      await expect(page.getByRole("heading", { level: 2, name: destination.heading })).toBeVisible();
    }
  });

  test("manager role sees limited navigation and is blocked from admin-only routes", async ({
    page,
    managerUser,
    loginAs
  }) => {
    await loginAs(managerUser);
    await page.goto("/admin");

    const visibleLinks = ["/admin", "/admin/groups", "/admin/assign", "/admin/analytics"];
    for (const href of visibleLinks) {
      await expect(page.getByTestId(navTestId(href))).toBeVisible();
    }

    const hiddenLinks = ["/admin/users", "/admin/audit", "/admin/org"];
    for (const href of hiddenLinks) {
      await expect(page.getByTestId(navTestId(href))).toHaveCount(0);
    }

    await page.goto("/admin/users");
    await page.waitForURL("**/app");
    await expect(page).toHaveURL(/\/app/);
  });

  test("breadcrumbs expose trail and link back to admin home", async ({ page, adminUser, loginAs }) => {
    await loginAs(adminUser);
    await page.goto("/admin/groups");

    const roboticsRow = page.getByRole("row", { name: /Robotics Pathway/i });
    await expect(roboticsRow).toBeVisible();
    await roboticsRow.getByRole("link", { name: "Manage" }).click();
    await page.waitForURL("**/admin/groups/group-robotics-pathway");

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    await expect(breadcrumb.getByRole("link", { name: "Groups" })).toHaveAttribute("href", "/admin/groups");
    await expect(breadcrumb).toContainText("Robotics Pathway");

    await breadcrumb.getByRole("link", { name: "Admin" }).click();
    await page.waitForURL("**/admin");
  });

  test("mobile drawer focuses first link and closes after navigation", async ({ page, adminUser, loginAs }) => {
    await loginAs(adminUser);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin");

    const menuButton = page.getByTestId("admin-topbar-menu-button");
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const dashboardLink = page.getByTestId(navTestId("/admin"));
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toBeFocused();

    const groupsLink = page.getByTestId(navTestId("/admin/groups"));
    const waitForGroups = page.waitForURL("**/admin/groups");
    await groupsLink.click();
    await waitForGroups;

    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });

  test("admin 404 provides recovery links", async ({ page, adminUser, loginAs }) => {
    await loginAs(adminUser);
    await page.goto("/admin/does-not-exist");

    await expect(page.getByRole("heading", { name: /couldn't find that admin page/i })).toBeVisible();
    await expect(page.getByTestId("admin-not-found-dashboard-link")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Users" })).toBeVisible();
  });

  test("keyboard shortcuts navigate between admin destinations", async ({ page, adminUser, loginAs }) => {
    await loginAs(adminUser);
    await page.goto("/admin/groups");

    await page.keyboard.press("g");
    await page.keyboard.press("u");
    await page.waitForURL("**/admin/users");
    await expect(page).toHaveURL(/\/admin\/users$/);
  });
});
