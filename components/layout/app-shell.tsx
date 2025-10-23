"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import type { FocusEvent as ReactFocusEvent, ReactNode } from "react";

import { signOutAction } from "@/app/actions/sign-out";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SIGN_OUT_TOAST_STORAGE_KEY } from "@/lib/storage-keys";
import { cn } from "@/lib/utils";
import { PageFadeIn } from "./page-fade-in";
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
    <div className="flex min-h-screen flex-col bg-base-200 text-base-content">
      <Header
        displayName={displayName}
        menuAvatar={<UserMenuAvatar image={userImage} initials={userInitials} name={displayName} />}
        orgName={orgName}
        pageTitle={pageTitle}
      />
      <div className="flex flex-1">
        <DesktopSidebar navItems={navItems} orgName={orgName} />
        <main className="relative flex-1">
          <PageFadeIn className="mx-auto w-full max-w-6xl px-6 py-10 lg:px-10">
            {children}
          </PageFadeIn>
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
    <header className="navbar sticky top-0 z-30 bg-base-100 shadow-sm">
      <div className="navbar-start flex-col items-start gap-1">
        <Link href="/app" className="btn btn-ghost px-3 text-left">
          <span className="text-xs font-semibold uppercase tracking-[0.32em] text-primary">POP Initiative</span>
        </Link>
        <span className="hidden text-sm font-semibold text-muted-foreground sm:inline">{orgName}</span>
      </div>
      <div className="navbar-center hidden md:flex">
        <span className="text-sm font-semibold text-muted-foreground">{pageTitle ?? "Page title"}</span>
      </div>
      <div className="navbar-end gap-3">
        <ThemeModeToggle />
        <span className="hidden text-sm font-semibold sm:inline" aria-live="polite">
          {displayName}
        </span>
        {menuAvatar}
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
    <aside className="hidden w-72 flex-col gap-4 border-r border-base-300 bg-base-200/70 p-4 lg:flex">
      <div className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
        <p className="text-sm font-semibold leading-tight text-base-content">{orgName}</p>
        <p className="text-xs text-muted-foreground">Learning journeys</p>
      </div>
      <nav aria-label="Primary" className="flex-1">
        <ul className="menu menu-lg gap-2 rounded-box bg-base-100 p-3 shadow-sm">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} isActive={item.isActive} label={item.label} />
          ))}
        </ul>
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
    <nav className="btm-nav z-30 border-t border-base-300 bg-base-100/95 shadow-lg backdrop-blur lg:hidden">
      {navItems.map((item) => (
        <NavLink key={item.href} href={item.href} isActive={item.isActive} label={item.label} condensed />
      ))}
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
  if (condensed) {
    return (
      <Link
        href={href}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold",
          isActive ? "active text-primary" : "text-muted-foreground hover:text-primary"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        {label}
      </Link>
    );
  }

  return (
    <li className={isActive ? "active" : undefined}>
      <Link
        href={href}
        className="text-sm font-semibold"
        aria-current={isActive ? "page" : undefined}
      >
        {label}
      </Link>
    </li>
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const pointerDownOutsideRef = useRef(false);
  const firstItemRef = useRef<HTMLAnchorElement | null>(null);
  const router = useRouter();

  const closeMenu = useCallback(
    (options?: { focusTrigger?: boolean }) => {
      setOpen(false);
      if (options?.focusTrigger) {
        setTimeout(() => {
          triggerRef.current?.focus();
        }, 0);
      }
    },
    []
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current) return;
      pointerDownOutsideRef.current = !containerRef.current.contains(event.target as Node);
    };

    const handlePointerUp = () => {
      if (pointerDownOutsideRef.current) {
        closeMenu();
      }
      pointerDownOutsideRef.current = false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu({ focusTrigger: true });
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("keydown", handleKeyDown);
      pointerDownOutsideRef.current = false;
    };
  }, [closeMenu, open]);

  useEffect(() => {
    if (!open) return;

    const focusTarget = firstItemRef.current ?? menuPanelRef.current?.querySelector<HTMLElement>("[role='menuitem']");
    focusTarget?.focus();
  }, [open]);

  const toggleMenu = () => setOpen((previous) => !previous);

  const handleSignOut = () => {
    closeMenu();
    startTransition(async () => {
      try {
        await signOutAction();
        if (typeof window !== "undefined") {
          sessionStorage.setItem(SIGN_OUT_TOAST_STORAGE_KEY, "Signed out");
        }
        router.push("/");
        router.refresh();
      } catch (error) {
        console.error("Failed to sign out", error);
      }
    });
  };

  const handleMenuBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const nextFocus = event.relatedTarget as Node | null;
    if (!menuPanelRef.current) return;
    if (!nextFocus) return;
    if (!menuPanelRef.current.contains(nextFocus)) {
      closeMenu();
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        className="btn btn-ghost btn-circle"
        ref={triggerRef}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={image ?? undefined} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </button>
      <ul
        id="user-menu"
        role="menu"
        aria-label="Account"
        className={cn(
          "menu menu-sm absolute right-0 mt-3 w-56 rounded-box border border-base-300 bg-base-100 p-3 text-sm shadow-xl",
          open ? "block" : "hidden"
        )}
        ref={menuPanelRef}
        onBlur={handleMenuBlur}
      >
        <li className="rounded-box bg-base-200/80 p-3">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="truncate text-sm font-medium text-base-content" aria-live="polite">
            {name}
          </p>
        </li>
        <li>
          <Link
            href="/settings"
            role="menuitem"
            className="rounded-lg"
            onClick={() => closeMenu()}
            ref={firstItemRef}
          >
            Profile &amp; settings
          </Link>
        </li>
        <li>
          <button
            type="button"
            role="menuitem"
            className="btn btn-error btn-sm text-base-100"
            onClick={handleSignOut}
            aria-busy={isPending}
            disabled={isPending}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span>Sign out</span>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            </span>
          </button>
        </li>
      </ul>
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
