/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("node:path");
const fs = require("node:fs/promises");
const { ADMIN_NAV } = require("../lib/admin/nav");

type Dirent = import("node:fs").Dirent;
type AdminNavItem = import("../lib/admin/nav").AdminNavItem;

async function main() {
  const adminDir = path.resolve(__dirname, "../app/admin");
  const navHrefs = new Set((ADMIN_NAV as AdminNavItem[]).map((item) => item.href));
  const warnings: string[] = [];

  const entries = (await fs.readdir(adminDir, { withFileTypes: true })) as Dirent[];

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isDirectory()) return;
      if (entry.name.includes("[")) return;

      const pagePath = path.join(adminDir, entry.name, "page.tsx");
      try {
        await fs.stat(pagePath);
      } catch {
        return;
      }

      const href = `/admin/${entry.name}`;
      if (!navHrefs.has(href)) {
        warnings.push(href);
      }
    })
  );

  if (warnings.length > 0) {
    console.warn("[admin-nav] The following admin routes do not have matching navigation entries:");
    for (const href of warnings.sort()) {
      console.warn(`  - ${href}`);
    }
    console.warn("Update lib/admin/nav.ts to register these routes.");
    process.exitCode = 0;
  } else {
    console.log("[admin-nav] All admin routes are registered in the navigation.");
  }
}

void main().catch((error: unknown) => {
  console.error("[admin-nav] Failed to verify admin navigation:", error);
  process.exitCode = 1;
});
