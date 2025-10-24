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

  const hasSidebar = navItems.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-base-100 text-base-content">
      <Header
        displayName={displayName}
        menuAvatar={<UserMenuAvatar image={userImage} initials={userInitials} name={displayName} />}
        orgName={orgName}
        pageTitle={pageTitle}
      />
      <div className="flex-1 py-8">
        <PageContainer>
          <div className="grid grid-cols-12 gap-6">
            {hasSidebar ? (
              <aside className="col-span-12 hidden lg:col-span-3 lg:block">
                <LeftRail navItems={navItems} />
              </aside>
            ) : null}
            <section
              className={cn(
                "col-span-12 space-y-6",
                hasSidebar ? "lg:col-span-9" : "lg:col-span-12"
              )}
            >
              {hasSidebar ? <MobileNav navItems={navItems} /> : null}
              <PageFadeIn>{children}</PageFadeIn>
            </section>
          </div>
        </PageContainer>
      </div>
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
    <header className="navbar sticky top-0 z-40 border-b border-base-300 bg-base-100/90 backdrop-blur">
      <PageContainer className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/app" className="text-lg font-semibold">
            POP Initiative
          </Link>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Organization</span>
            <span className="text-sm font-medium text-base-content">{orgName}</span>
          </div>
          {pageTitle ? (
            <span className="hidden text-sm font-medium text-muted-foreground md:inline">/ {pageTitle}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <ThemeModeToggle />
          <span className="hidden text-sm font-semibold lg:inline" aria-live="polite">
            {displayName}
          </span>
          {menuAvatar}
        </div>
      </PageContainer>
    </header>
  );
}

type LeftRailProps = {
  navItems: Array<SidebarLink & { isActive: boolean }>;
};

function LeftRail({ navItems }: LeftRailProps) {
  if (navItems.length === 0) return null;

  return (
    <nav aria-label="App navigation">
      <div className="w-[280px]">
        <ul className="menu menu-lg rounded-box bg-base-200 p-4">
          {navItems.map((item) => (
            <li key={item.href} className={cn(item.isActive && "active")}>
              <Link href={item.href} aria-current={item.isActive ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

type MobileNavProps = {
  navItems: Array<SidebarLink & { isActive: boolean }>;
};

function MobileNav({ navItems }: MobileNavProps) {
  if (navItems.length === 0) return null;

  return (
    <nav className="lg:hidden" aria-label="App navigation">
      <ul className="menu menu-horizontal w-full justify-between rounded-box bg-base-200 p-2 text-sm font-semibold">
        {navItems.map((item) => (
          <li key={item.href} className={cn("flex-1", item.isActive && "active")}>
            <Link href={item.href} aria-current={item.isActive ? "page" : undefined}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
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
      <Button
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        variant="ghost"
        size="icon"
        className="btn-circle border border-base-300 bg-base-100/90 shadow-sm"
        ref={triggerRef}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={image ?? undefined} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </Button>
      <ul
        id="user-menu"
        role="menu"
        aria-label="Account"
        className={cn(
          "menu menu-sm absolute right-0 mt-3 w-60 rounded-box border border-base-300 bg-base-100/95 p-4 text-sm shadow-lg backdrop-blur",
          open ? "block" : "hidden"
        )}
        ref={menuPanelRef}
        onBlur={handleMenuBlur}
      >
        <li className="rounded-box border border-base-300 bg-base-100/90 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signed in as</p>
          <p className="mt-1 truncate text-sm font-medium text-base-content" aria-live="polite">
            {name}
          </p>
        </li>
        <li>
          <Link
            href="/settings"
            role="menuitem"
            className="rounded-lg px-3 py-2 font-medium text-muted-foreground transition hover:bg-base-200 hover:text-primary"
            onClick={() => closeMenu()}
            ref={firstItemRef}
          >
            Profile &amp; settings
          </Link>
        </li>
        <li>
          <Button
            type="button"
            role="menuitem"
            variant="destructive"
            size="sm"
            className="w-full justify-between rounded-lg px-4 py-2"
            onClick={handleSignOut}
            aria-busy={isPending}
            disabled={isPending}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span>Sign out</span>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            </span>
          </Button>
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
