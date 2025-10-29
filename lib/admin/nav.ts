import type { ReactNode } from "react";

export const ADMIN_ROOT_PATH = "/admin";
export const ADMIN_ROOT_LABEL = "Admin";

export type AdminNavItem = {
  label: string;
  href: string;
  icon?: ReactNode;
  roles: Array<"ADMIN" | "MANAGER">;
  exact?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [];

export function registerAdminPage(item: AdminNavItem) {
  if (ADMIN_NAV.some((entry) => entry.href === item.href)) {
    throw new Error(`Admin nav item with href "${item.href}" is already registered.`);
  }

  ADMIN_NAV.push(item);
}

registerAdminPage({ label: "Dashboard", href: ADMIN_ROOT_PATH, roles: ["ADMIN", "MANAGER"], exact: true });
registerAdminPage({ label: "Users", href: "/admin/users", roles: ["ADMIN"] });
registerAdminPage({ label: "Groups", href: "/admin/groups", roles: ["ADMIN", "MANAGER"] });
registerAdminPage({ label: "Assignments", href: "/admin/assign", roles: ["ADMIN", "MANAGER"] });
registerAdminPage({ label: "Org Settings", href: "/admin/org", roles: ["ADMIN"] });
registerAdminPage({ label: "Audit", href: "/admin/audit", roles: ["ADMIN"] });
registerAdminPage({ label: "Analytics", href: "/admin/analytics", roles: ["ADMIN", "MANAGER"] });
