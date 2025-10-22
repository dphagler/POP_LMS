import type { SidebarLink } from "@/components/layout/app-shell";

export function buildAppNavLinks(includeAdmin: boolean): SidebarLink[] {
  const links: SidebarLink[] = [
    { href: "/app#today", label: "Today" },
    { href: "/app#up-next", label: "Up Next" },
    { href: "/app#completed", label: "Completed" },
    { href: "/app/settings", label: "Settings" },
  ];

  if (includeAdmin) {
    links.push({ href: "/admin", label: "Admin" });
  }

  return links;
}
