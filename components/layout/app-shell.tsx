import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const NAV_ITEM_BASE_CLASSES = "flex items-center rounded-md px-3 py-2 text-sm transition-colors";

type SidebarLink = {
  href: string;
  label: string;
  isActive?: boolean;
};

export type AppShellProps = {
  orgName: string;
  userName?: string | null;
  userImage?: string | null;
  sidebarLinks: SidebarLink[];
  children: ReactNode;
};

export function AppShell({
  children,
  orgName,
  userImage,
  userName,
  sidebarLinks,
}: AppShellProps) {
  const displayName = userName?.trim() || "Learner";
  const orgInitials = getInitials(orgName);
  const userInitials = getInitials(displayName);

  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] bg-background text-foreground">
      <header className="border-b bg-card/40 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase tracking-wide text-primary">
              {orgInitials}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">{orgName}</span>
              <span className="text-xs text-muted-foreground">Learner dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs text-muted-foreground">Ready to learn</p>
            </div>
            <Avatar className="h-10 w-10">
              <AvatarImage src={userImage ?? undefined} alt={displayName} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[15rem_1fr]">
        <aside className="border-b border-r bg-muted/20 lg:border-b-0">
          <nav
            aria-label="Dashboard sections"
            className="flex flex-row gap-2 overflow-x-auto px-4 py-4 text-sm font-medium lg:flex-col lg:px-6 lg:py-8"
          >
            {sidebarLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  NAV_ITEM_BASE_CLASSES,
                  "whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground",
                  link.isActive && "bg-muted text-foreground shadow-sm"
                )}
                aria-current={link.isActive ? "page" : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </aside>
        <main className="px-6 py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function getInitials(value: string) {
  const [first = "", second = ""] = value
    .split(" ")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const firstChar = first.charAt(0);
  const secondChar = second.charAt(0);

  const initials = `${firstChar}${secondChar}`.toUpperCase();
  if (initials) return initials;
  return value.slice(0, 2).toUpperCase() || "PO";
}
