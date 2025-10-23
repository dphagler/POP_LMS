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
import { PageContainer } from "./page-container";
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
    <div className="relative flex min-h-screen flex-col text-base-content">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/40 to-transparent dark:from-slate-950/80 dark:via-slate-950/60" />
        <div className="absolute left-12 top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
        <div className="absolute right-[-10%] top-1/2 h-80 w-80 rounded-full bg-secondary/10 blur-3xl dark:bg-secondary/20" />
      </div>
      <Header
        displayName={displayName}
        menuAvatar={<UserMenuAvatar image={userImage} initials={userInitials} name={displayName} />}
        orgName={orgName}
        pageTitle={pageTitle}
      />
      <div className="flex flex-1">
        <DesktopSidebar navItems={navItems} orgName={orgName} />
        <main className="relative flex-1">
          <PageFadeIn>
            <PageContainer className="py-10 lg:py-12">{children}</PageContainer>
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
    <header className="sticky top-0 z-30 border-b border-base-300/60 bg-base-100/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-4 lg:px-10">
        <div className="flex flex-1 items-center gap-4">
          <Link
            href="/app"
            className="group flex items-center gap-2 rounded-full border border-base-300/60 bg-base-100/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-primary shadow-sm shadow-primary/10 transition hover:-translate-y-0.5 hover:shadow-primary/25"
          >
            POP Initiative
          </Link>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Organization</span>
            <span className="text-sm font-medium text-base-content">{orgName}</span>
          </div>
        </div>
        <div className="hidden flex-1 items-center justify-center md:flex">
          <span className="rounded-full border border-transparent bg-base-100/70 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm shadow-primary/5">
            {pageTitle ?? "Page title"}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          <ThemeModeToggle />
          <span className="hidden text-sm font-semibold lg:inline" aria-live="polite">
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
    <aside className="hidden w-72 flex-col border-r border-base-300/60 bg-base-100/40 px-6 py-10 backdrop-blur-xl lg:flex">
      <div className="flex flex-1 flex-col gap-6">
        <div className="rounded-3xl border border-base-300/70 bg-base-100/90 p-6 shadow-xl shadow-primary/5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Your org</p>
          <p className="mt-2 text-lg font-semibold text-base-content">{orgName}</p>
          <p className="text-sm text-muted-foreground">Learning journeys</p>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} isActive={item.isActive} label={item.label} />
          ))}
        </nav>
      </div>
    </aside>
  );
}

type MobileNavProps = {
  navItems: Array<SidebarLink & { isActive: boolean }>;
};

function MobileNav({ navItems }: MobileNavProps) {
  if (navItems.length === 0) return null;

  return (
    <nav className="btm-nav z-30 border-t border-base-300/60 bg-base-100/90 shadow-lg backdrop-blur lg:hidden">
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
          "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold transition",
          isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold transition",
        isActive
          ? "bg-primary/10 text-primary shadow-sm shadow-primary/20 ring-1 ring-inset ring-primary/20"
          : "text-muted-foreground hover:-translate-y-0.5 hover:border-base-300/80 hover:bg-base-100/80 hover:text-primary hover:shadow-lg hover:shadow-primary/10"
      )}
      aria-current={isActive ? "page" : undefined}
    >
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuPanelRef = useRef<HTMLUListElement | null>(null);
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

  const handleMenuBlur = (event: ReactFocusEvent<HTMLUListElement>) => {
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
        className="btn btn-circle border border-base-300/60 bg-base-100/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-primary/20"
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
          "menu menu-sm absolute right-0 mt-3 w-60 rounded-3xl border border-base-300/70 bg-base-100/95 p-4 text-sm shadow-2xl shadow-primary/15 backdrop-blur",
          open ? "block" : "hidden"
        )}
        ref={menuPanelRef}
        onBlur={handleMenuBlur}
      >
        <li className="rounded-2xl border border-base-300/60 bg-base-100/80 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signed in as</p>
          <p className="mt-1 truncate text-sm font-medium text-base-content" aria-live="polite">
            {name}
          </p>
        </li>
        <li>
          <Link
            href="/settings"
            role="menuitem"
            className="rounded-xl px-3 py-2 font-medium text-muted-foreground transition hover:bg-base-100 hover:text-primary"
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
            className="btn btn-error btn-sm rounded-xl px-4 py-2 font-semibold text-base-100 shadow-lg shadow-error/20"
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
