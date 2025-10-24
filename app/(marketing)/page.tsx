"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, BarChart3, GraduationCap, Menu, Sparkles, Trophy, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageFadeIn } from "@/components/layout/page-fade-in";
import { SIGN_OUT_TOAST_STORAGE_KEY } from "@/lib/storage-keys";
import { cn } from "@/lib/utils";

// NOTE: Tooltip/PopoverTrigger/MenuButton/AspectRatio must receive exactly one element child.

const benefits = [
  {
    title: "Micro-learning videos",
    description:
      "Short, cinematic lessons make it easy for students to learn essential professional habits.",
    icon: Sparkles,
  },
  {
    title: "Gamification & credentials",
    description:
      "Leaderboards, streaks, and verified certificates motivate learners to keep leveling up.",
    icon: Trophy,
  },
  {
    title: "Growth dashboards",
    description:
      "Real-time insights show teachers exactly how cohorts are progressing week over week.",
    icon: BarChart3,
  },
  {
    title: "Interview practice",
    description:
      "Guided prompts help learners rehearse answers and build confidence before the big day.",
    icon: GraduationCap,
  },
];

const heroHighlights = [
  "Launch sequenced essential-skill pathways in minutes—no new staff required.",
  "Automated nudges, leaderboards, and streaks keep classrooms engaged every day.",
  "District dashboards tie participation to career readiness benchmarks you can report on.",
];

const heroStats = [
  { value: "28", label: "Active cohorts nationwide" },
  { value: "94%", label: "Average completion rate" },
  { value: "8.7/10", label: "Learner satisfaction" },
  { value: "120+", label: "Micro-lessons ready to launch" },
];

const stats = [
  { value: "92%", label: "Completion rate across districts" },
  { value: "4.3 days", label: "Average student streak" },
  { value: "12 cohorts", label: "Classes collaborating weekly" },
  { value: "100+", label: "Micro-lessons ready to launch" },
];

const stakeholders = [
  {
    title: "District leaders",
    description: "Unlock clear ROI with dashboards that showcase readiness gains across every campus.",
    icon: BarChart3,
  },
  {
    title: "Teachers & coaches",
    description: "Launch curated playlists in minutes and monitor classroom engagement at a glance.",
    icon: Sparkles,
  },
  {
    title: "Students",
    description: "Earn micro-credentials, build interview confidence, and bring positivity into every team.",
    icon: GraduationCap,
  },
];

const TOAST_AUTO_DISMISS_MS = 4000;

const NAV_ITEMS = [
  { id: "features", label: "Features" },
  { id: "why", label: "Why POP" },
  { id: "who", label: "Who it's for" },
];

export default function MarketingPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>(NAV_ITEMS[0]?.id ?? "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedMessage = sessionStorage.getItem(SIGN_OUT_TOAST_STORAGE_KEY);
    if (storedMessage) {
      setToastMessage(storedMessage);
      sessionStorage.removeItem(SIGN_OUT_TOAST_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), TOAST_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const dismissToast = () => setToastMessage(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sectionElements = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );

    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-55% 0px -35% 0px",
        threshold: [0.1, 0.25, 0.5],
      },
    );

    sectionElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleHashChange = () => setMobileMenuOpen(false);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        mobileMenuButtonRef.current &&
        !mobileMenuButtonRef.current.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const handleMenuToggle = () => setMobileMenuOpen((open) => !open);

  const handleNavItemClick = () => setMobileMenuOpen(false);

  return (
    <PageFadeIn
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-base-100 via-base-100/90 to-base-200 text-foreground dark:from-base-950 dark:via-base-950/90 dark:to-base-900"
      role="main"
    >
      <SignedOutToast message={toastMessage} onDismiss={dismissToast} />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/15"
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.8, 1.05, 0.8] }}
          transition={{ duration: 14, repeat: Infinity }}
        />
        <motion.div
          className="absolute right-0 top-0 h-96 w-96 translate-x-1/3 rounded-full bg-secondary/20 blur-[120px] dark:bg-secondary/10"
          initial={{ opacity: 0.3, y: -20 }}
          animate={{ opacity: [0.3, 0.6, 0.3], y: [-20, 10, -20] }}
          transition={{ duration: 18, repeat: Infinity }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-base-200/60 bg-base-100/90 backdrop-blur dark:border-base-800/60 dark:bg-base-950/70">
        <MaxContainer className="relative flex items-center gap-4 py-4">
          <div className="flex flex-1 items-center justify-start">
            <Button
              as={Link}
              href="#hero"
              onClick={handleNavItemClick}
              variant="ghost"
              className="px-2 text-lg font-semibold normal-case tracking-tight text-foreground"
            >
              POP Initiative
            </Button>
          </div>
          <nav className="hidden flex-1 items-center justify-center lg:flex">
            <ul className="menu menu-horizontal gap-2 rounded-full bg-transparent p-0">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <Button
                      as={Link}
                      href={`#${item.id}`}
                      variant="ghost"
                      className={cn(
                        "px-4 py-2 text-sm font-semibold normal-case tracking-tight transition",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/80 hover:bg-base-200/60 hover:text-primary",
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.label}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="hidden md:flex items-center gap-3">
              <Button
                as={Link}
                href="/signin"
                variant="ghost"
                className="px-5 py-2 text-sm font-semibold normal-case text-foreground"
              >
                Log in
              </Button>
              <Button
                as={Link}
                href="/signup"
                className="px-6 py-2 text-sm font-semibold normal-case text-primary-content shadow-primary/30"
              >
                Sign up
              </Button>
            </div>
            <div className="relative flex items-center md:hidden">
              <Button
                ref={mobileMenuButtonRef}
                type="button"
                variant="ghost"
                size="sm"
                className="px-3"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-navigation"
                aria-label="Toggle navigation menu"
                onClick={handleMenuToggle}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </Button>
              {mobileMenuOpen ? (
                <div
                  ref={mobileMenuRef}
                  id="mobile-navigation"
                  className="dropdown-content absolute right-0 top-full mt-3 w-64 space-y-2 rounded-2xl border border-base-200/70 bg-base-100/95 p-4 shadow-xl backdrop-blur-lg dark:border-base-800/70 dark:bg-base-950/95"
                >
                  <nav className="flex flex-col gap-2">
                    {NAV_ITEMS.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <Link
                          key={item.id}
                          href={`#${item.id}`}
                          className={cn(
                            "rounded-xl px-4 py-3 text-base font-semibold transition",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-base-200/70 hover:text-primary",
                          )}
                          aria-current={isActive ? "page" : undefined}
                          onClick={handleNavItemClick}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      as={Link}
                      href="/signin"
                      onClick={handleNavItemClick}
                      variant="ghost"
                      className="w-full px-4 py-3 text-base font-semibold normal-case"
                    >
                      Log in
                    </Button>
                    <Button
                      as={Link}
                      href="/signup"
                      onClick={handleNavItemClick}
                      className="w-full px-4 py-3 text-base font-semibold normal-case text-primary-content"
                    >
                      Sign up
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </MaxContainer>
      </header>

      <div className="relative z-10 space-y-0">
        <HeroSection highlights={heroHighlights} />
        <FeaturesSection />
        <StatsSection />
        <StakeholdersSection />
        <CTASection />
      </div>

      <footer className="border-t border-base-300/70 bg-base-100/80 py-8 text-muted-foreground backdrop-blur dark:border-base-800/70 dark:bg-base-950/60">
        <MaxContainer className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground/80">Built by the POP Initiative</p>
          <nav className="flex items-center gap-6">
            <Link href="/about" className="transition hover:text-primary">
              About
            </Link>
            <Link href="#pricing" className="transition hover:text-primary">
              Pricing
            </Link>
            <Link href="mailto:hello@poplearning.com" className="transition hover:text-primary">
              Contact
            </Link>
          </nav>
        </MaxContainer>
      </footer>
    </PageFadeIn>
  );
}

type HeroSectionProps = {
  highlights: string[];
};

function HeroSection({ highlights }: HeroSectionProps) {
  return (
    <>
      <section id="hero" className="hero scroll-mt-32 min-h-[70vh] bg-base-200 py-16 text-foreground sm:py-24">
        <div className="hero-content mx-auto max-w-7xl flex-col-reverse items-center gap-12 lg:flex-row">
          <motion.div
            className="w-full space-y-6 text-center lg:max-w-2xl lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
              Workforce readiness reimagined
            </span>
            <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
              Career readiness that scales across your district
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl lg:mx-0">
              POP Initiative operationalizes employability skills with cinematic micro-lessons, AI-guided practice, and
              reporting that proves impact to boards, partners, and funders.
            </p>
            <ul className="mx-auto grid max-w-2xl gap-3 text-left text-sm text-muted-foreground lg:mx-0">
              {highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Button as={Link} href="/signin" size="lg" fontSize="lg">
                Log in
              </Button>
              <Button as={Link} href="/signup" variant="outline" size="lg" fontSize="lg">
                Sign up
              </Button>
            </div>
          </motion.div>
          <motion.div
            className="flex w-full max-w-lg justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <div className="mockup-window border border-base-300 bg-base-100 shadow-xl">
              <div className="flex h-full flex-col justify-between gap-6 bg-base-100 p-8">
                <div className="space-y-3 text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Today’s focus</p>
                  <h3 className="text-xl font-semibold">Collaborative problem solving</h3>
                  <p className="text-sm text-muted-foreground">
                    Learners watch a five-minute story-driven lesson, then complete a quick reflection to earn their daily streak points.
                  </p>
                </div>
                <div className="grid gap-4 rounded-2xl bg-base-200/80 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Active learners</span>
                    <span className="font-semibold text-foreground">36</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Team leaderboard</span>
                    <span className="font-semibold text-foreground">#1 Momentum</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Next milestone</span>
                    <span className="font-semibold text-foreground">Reflection badges</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      <div className="bg-base-100 py-6">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="stats stats-vertical shadow bg-base-100 text-foreground sm:stats-horizontal">
            {heroStats.map((item) => (
              <div key={item.label} className="stat">
                <div className="stat-title text-sm uppercase tracking-[0.2em] text-muted-foreground">{item.label}</div>
                <div className="stat-value text-3xl font-bold text-primary">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function FeaturesSection() {
  return (
    <Section id="features">
      <SectionHeader
        title="Why schools choose POP Learning"
        description="Everything you need to nurture employability skills in every classroom—no extra prep required."
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <Card
              key={benefit.title}
              className="card group h-full border border-base-300/60 bg-base-100/90 shadow-xl shadow-primary/10 transition hover:-translate-y-1 hover:shadow-primary/30 dark:border-base-800/60 dark:bg-base-900/80 dark:shadow-primary/20"
            >
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:scale-105">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl font-semibold text-foreground">{benefit.title}</CardTitle>
                <CardDescription className="text-base text-muted-foreground">{benefit.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

function StatsSection() {
  return (
    <Section id="why" className="bg-base-100/80">
      <SectionHeader
        title="Momentum you can measure"
        description="Transparent metrics keep leadership, teachers, and students aligned on measurable skill growth."
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="card space-y-2 rounded-3xl border border-base-300/60 bg-base-100/90 p-8 text-center shadow-sm dark:border-base-800/60 dark:bg-base-900/70"
          >
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function StakeholdersSection() {
  return (
    <Section id="who">
      <div className="space-y-10 rounded-[2.5rem] border border-base-300/60 bg-base-100/90 p-10 text-center shadow-[0_45px_120px_-70px_rgba(79,70,229,0.6)] dark:border-base-800/60 dark:bg-base-900/80 dark:text-foreground">
        <div className="mx-auto max-w-3xl space-y-4">
          <h2 className="text-3xl font-bold text-foreground">Built for every stakeholder</h2>
          <p className="text-base text-muted-foreground">
            POP connects administrators, teachers, and students with a shared growth language. AI-curated lessons,
            gamified cohorts, and real-time reporting keep everyone aligned on essential-skill mastery.
          </p>
        </div>
        <div className="grid gap-6 text-left sm:grid-cols-2 xl:grid-cols-3">
          {stakeholders.map((stakeholder) => {
            const Icon = stakeholder.icon;
            return (
              <Card
                key={stakeholder.title}
                className="h-full border border-base-300/70 bg-base-100/95 shadow-lg shadow-primary/10 transition hover:-translate-y-1 hover:shadow-primary/30 dark:border-base-800/60 dark:bg-base-900/70"
              >
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-foreground">{stakeholder.title}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    {stakeholder.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

function CTASection() {
  return (
    <Section>
      <div className="join join-vertical w-full rounded-box bg-base-200 p-8 text-foreground shadow-[0_35px_80px_-60px_rgba(79,70,229,0.55)] dark:bg-base-900/80">
        <div className="join-item flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3 text-center sm:text-left">
            <h2 className="text-3xl font-bold">Bring POP Learning to your community</h2>
            <p className="text-base text-muted-foreground">
              Activate your district in days with guided onboarding and ready-to-launch career readiness pathways.
            </p>
          </div>
          <div className="join join-horizontal join-item flex flex-wrap items-center justify-center gap-3">
            <Button
              as={Link}
              href="/signin"
              className="join-item inline-flex items-center gap-2 shadow-lg shadow-primary/25"
            >
              Log in
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              as={Link}
              href="/signup"
              variant="outline"
              className="join-item inline-flex items-center gap-2 border-primary/40 bg-base-100/80 text-primary shadow-sm backdrop-blur dark:border-primary/50"
            >
              Book a demo
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}

type SignedOutToastProps = {
  message: string | null;
  onDismiss: () => void;
};

function SignedOutToast({ message, onDismiss }: SignedOutToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-auto fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-base-300/70 bg-base-100/95 px-4 py-2 text-sm font-medium text-foreground shadow-xl backdrop-blur"
    >
      <span>{message}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="rounded-full px-3 text-xs font-semibold uppercase tracking-wide"
        aria-label="Dismiss notification"
      >
        Dismiss
      </Button>
    </div>
  );
}

type SectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
};

function Section({ children, className, id }: SectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-32 py-16 sm:py-24", className)}>
      <MaxContainer className="space-y-6">{children}</MaxContainer>
    </section>
  );
}

type SectionHeaderProps = {
  title: string;
  description?: string;
};

function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-center">
      <h2 className="text-3xl font-bold text-foreground">{title}</h2>
      {description ? <p className="text-base text-muted-foreground sm:text-lg">{description}</p> : null}
    </div>
  );
}

type MaxContainerProps = {
  children: ReactNode;
  className?: string;
};

function MaxContainer({ children, className }: MaxContainerProps) {
  return <div className={cn("container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
