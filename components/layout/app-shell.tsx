"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/actions/sign-out";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeModeToggle } from "./theme-toggle";

export type SidebarLink = {
  href: string;
  label: string;
};

export type AppShellProps = {
  children: ReactNode;
  orgName: string;
  pageTitle?: string;
  sidebarLinks: SidebarLink[];
  userImage?: string | null;
  userName?: string | null;
};

export function AppShell({
  children,
  orgName,
  pageTitle,
  sidebarLinks,
  userImage,
  userName,
}: AppShellProps) {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState<string>("#today");
  const displayName = userName?.trim() || "Learner";
  const userInitials = getInitials(displayName);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleHashChange = () => {
      const hash = window.location.hash || "#today";
      setActiveHash(hash);
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navItems = useMemo(
    () =>
      sidebarLinks.map((link) => {
        const [pathPart, hashPart] = link.href.split("#");
        const normalizedHash = activeHash || "#today";
        const linkPath = pathPart ?? "";
        const linkHash = hashPart ? `#${hashPart}` : "";

        const isActive = determineActiveState({
          pathname,
          linkPath,
          linkHash,
          normalizedHash,
        });

        return { ...link, isActive };
      }),
    [activeHash, pathname, sidebarLinks]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header
        displayName={displayName}
        menuAvatar={<UserMenuAvatar image={userImage} initials={userInitials} name={displayName} />}
        orgName={orgName}
        pageTitle={pageTitle}
      />
      <div className="flex flex-1">
        <DesktopSidebar navItems={navItems} orgName={orgName} />
        <main className="relative flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">{children}</div>
        </main>
      </div>
      <MobileNav navItems={navItems} />
    </div>
  );
}

type DeterminedActive = {
  linkHash: string;
  linkPath: string;
  normalizedHash: string;
  pathname: string;
};

function determineActiveState({ linkHash, linkPath, normalizedHash, pathname }: DeterminedActive) {
  const normalizedPath = linkPath || "";

  if (!normalizedPath && linkHash) {
    return normalizedHash === linkHash;
  }

  if (!normalizedPath) {
    return false;
  }

  if (normalizedPath === "/admin") {
    return pathname === normalizedPath || pathname.startsWith(`${normalizedPath}/`);
  }

  if (normalizedPath === "/app") {
    if (!linkHash) {
      return pathname === normalizedPath || pathname.startsWith(`${normalizedPath}/`);
    }

    if (pathname !== normalizedPath) {
      return linkHash === "#today" && pathname.startsWith(`${normalizedPath}/`);
    }

    return normalizedHash === linkHash;
  }

  return pathname === normalizedPath || pathname.startsWith(`${normalizedPath}/`);
}

type HeaderProps = {
  displayName: string;
  menuAvatar: ReactNode;
  orgName: string;
  pageTitle?: string;
};

function Header({ displayName, menuAvatar, orgName, pageTitle }: HeaderProps) {
  return (
    <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="text-sm font-semibold uppercase tracking-[0.28em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            POP Initiative
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline" aria-hidden>
            •
          </span>
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">{orgName}</span>
        </div>
        <div className="mx-auto hidden text-center md:block">
          <p className="text-sm font-medium text-muted-foreground">{pageTitle ?? "Page title"}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <ThemeModeToggle />
          <span className="hidden text-sm font-medium sm:inline" aria-live="polite">
            {displayName}
          </span>
          {menuAvatar}
        </div>
      </div>
    </header>
  );
}

type DesktopSidebarProps = {
  navItems: Array<SidebarLink & { isActive: boolean }>;
  orgName: string;
};

function DesktopSidebar({ navItems, orgName }: DesktopSidebarProps) {
  return (
    <aside className="hidden w-64 flex-col border-r bg-muted/25 lg:flex">
      <div className="border-b px-6 py-6">
        <p className="text-sm font-semibold leading-tight">{orgName}</p>
        <p className="text-xs text-muted-foreground">Learning journeys</p>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} isActive={item.isActive} label={item.label} />
        ))}
      </nav>
    </aside>
  );
}

type MobileNavProps = {
  navItems: Array<SidebarLink & { isActive: boolean }>;
};

function MobileNav({ navItems }: MobileNavProps) {
  if (navItems.length === 0) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-around px-1">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} isActive={item.isActive} label={item.label} condensed />
        ))}
      </div>
    </nav>
  );
}

type NavLinkProps = {
  condensed?: boolean;
  href: string;
  isActive: boolean;
  label: string;
};

function NavLink({ condensed, href, isActive, label }: NavLinkProps) {
  const className = cn(
    "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    condensed ? "mx-1" : "",
    isActive
      ? "bg-primary/10 text-primary shadow-sm"
      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
  );

  return (
    <Link href={href} className={className} aria-current={isActive ? "page" : undefined}>
      {label}
    </Link>
  );
}

type UserMenuAvatarProps = {
  image?: string | null;
  initials: string;
  name: string;
};

function UserMenuAvatar({ image, initials, name }: UserMenuAvatarProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggleMenu = () => setOpen((previous) => !previous);

  const handleSignOut = () => {
    setOpen(false);
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={image ?? undefined} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </button>
      <div
        id="user-menu"
        role="menu"
        aria-label="Account"
        className={cn(
          "absolute right-0 mt-3 w-52 origin-top-right rounded-md border bg-popover p-1 text-sm shadow-lg outline-none",
          open ? "block" : "hidden"
        )}
      >
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="truncate text-sm font-medium text-foreground" aria-live="polite">
            {name}
          </p>
        </div>
        <Link
          href="/app/profile"
          role="menuitem"
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() => setOpen(false)}
        >
          Profile &amp; settings
        </Link>
        <Button
          type="button"
          role="menuitem"
          variant="ghost"
          className="w-full justify-between rounded-md px-3 py-2 text-sm text-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={handleSignOut}
          aria-busy={isPending}
        >
          Sign out
        </Button>
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
