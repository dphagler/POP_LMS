import type { ReactNode } from "react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon?: ReactNode;
  roles: Array<"ADMIN" | "MANAGER">;
  exact?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", roles: ["ADMIN", "MANAGER"], exact: true },
  { label: "Users", href: "/admin/users", roles: ["ADMIN"] },
  { label: "Groups", href: "/admin/groups", roles: ["ADMIN", "MANAGER"] },
  { label: "Assignments", href: "/admin/assign", roles: ["ADMIN", "MANAGER"] },
  { label: "Org Settings", href: "/admin/org", roles: ["ADMIN"] },
  { label: "Audit", href: "/admin/audit", roles: ["ADMIN"] },
  { label: "Analytics", href: "/admin/analytics", roles: ["ADMIN"] }
];
