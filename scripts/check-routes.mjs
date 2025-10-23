import { access, readdir } from "node:fs/promises";
import { join } from "node:path";

const CRITICAL_ROUTES = ["/app", "/settings", "/admin"];
const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js", "page.mdx"];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function hasPageFile(routePath) {
  const entries = await readdir(routePath, { withFileTypes: true });
  return entries.some((entry) => entry.isFile() && PAGE_FILES.includes(entry.name));
}

async function routeExists(route) {
  const trimmed = route.replace(/^\/+|\/+$/g, "");
  const segments = trimmed ? trimmed.split("/") : [];
  const resolved = join(process.cwd(), "app", ...segments);

  if (!(await exists(resolved))) {
    return false;
  }

  try {
    if (await hasPageFile(resolved)) {
      return true;
    }
  } catch (error) {
    if (error?.code === "ENOTDIR") {
      return PAGE_FILES.some((pageFile) => resolved.endsWith(pageFile));
    }
    throw error;
  }

  return false;
}

async function main() {
  const missing = [];

  for (const route of CRITICAL_ROUTES) {
    // eslint-disable-next-line no-await-in-loop
    const present = await routeExists(route);
    if (!present) {
      missing.push(route);
    }
  }

  if (missing.length > 0) {
    console.error("\nCritical routes missing:\n");
    for (const route of missing) {
      console.error(` - ${route}`);
    }
    console.error("\nRestore the pages listed above before merging.\n");
    process.exit(1);
  }

  console.log("All critical routes are available:");
  for (const route of CRITICAL_ROUTES) {
    console.log(` - ${route}`);
  }
}

main().catch((error) => {
  console.error("Route audit failed:", error);
  process.exit(1);
});
