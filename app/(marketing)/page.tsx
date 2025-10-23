"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, BarChart3, GraduationCap, Sparkles, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageFadeIn } from "@/components/layout/page-fade-in";
import { SIGN_OUT_TOAST_STORAGE_KEY } from "@/lib/storage-keys";

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
  "AI-tailored, bite-sized lessons students actually finish.",
  "Leaderboards and streaks that boost collaboration.",
  "Dashboards that translate growth into career pathways.",
];

const TOAST_AUTO_DISMISS_MS = 4000;

export default function MarketingPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  return (
    <PageFadeIn
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-white/80 to-base-200 text-foreground"
      role="main"
    >
      <SignedOutToast message={toastMessage} onDismiss={dismissToast} />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.8, 1.05, 0.8] }}
          transition={{ duration: 14, repeat: Infinity }}
        />
        <motion.div
          className="absolute right-0 top-0 h-96 w-96 translate-x-1/3 rounded-full bg-secondary/20 blur-[120px]"
          initial={{ opacity: 0.3, y: -20 }}
          animate={{ opacity: [0.3, 0.6, 0.3], y: [-20, 10, -20] }}
          transition={{ duration: 18, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 py-20 lg:px-10">
          <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <motion.div
              className="space-y-8 text-center lg:text-left"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-primary">
                Workforce readiness reimagined
              </span>
              <h1 className="text-balance bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
                A modern LMS that feels like the apps students love.
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl lg:mx-0">
                POP Initiative delivers assessment-driven, video-first learning that equips every student with the
                essential skills employers expect—while giving educators the analytics they need to prove growth.
              </p>
              <ul className="mx-auto grid max-w-2xl gap-3 text-left text-sm text-muted-foreground lg:mx-0">
                {heroHighlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Button size="lg" asChild className="shadow-lg shadow-primary/20">
                  <Link href="/signin" className="gap-2">
                    Log in
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-primary/40 bg-base-100/60 backdrop-blur">
                  <Link href="/signup" className="gap-2">
                    Start free trial
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Essential skills. Positive people. Powerful teams.
              </p>
            </motion.div>
            <motion.div
              className="relative hidden h-full w-full justify-center lg:flex"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            >
              <div className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-base-300/60 bg-base-100/90 p-8 shadow-[0_45px_140px_-80px_rgba(79,70,229,0.7)] backdrop-blur">
                <div className="absolute -top-16 right-6 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />
                <div className="space-y-6 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Daily streak</span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">6 days</span>
                  </div>
                  <div className="space-y-3 rounded-3xl border border-base-300/60 bg-base-100/90 p-4 shadow-sm">
                    <p className="text-sm font-semibold text-foreground">Featured lesson</p>
                    <p className="text-sm text-muted-foreground">&ldquo;Build strong communication habits&rdquo;</p>
                    <div className="h-2 w-full rounded-full bg-base-300">
                      <div className="h-full w-3/4 rounded-full bg-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">75% complete · Resume now</p>
                  </div>
                  <div className="grid gap-4 rounded-3xl border border-base-300/60 bg-base-100/90 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Active cohorts</span>
                      <span className="text-sm text-primary">12 classrooms</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Completion rate</span>
                      <span className="font-semibold text-secondary">92%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Average streak</span>
                      <span className="font-semibold text-secondary">4.3 days</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-dashed border-base-300/70 bg-base-100/80 p-4 text-xs text-muted-foreground">
                    &ldquo;The first platform our students actually ask to log into.&rdquo; — CTE Director, Austin ISD
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          <section className="space-y-10">
            <div className="space-y-4 text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Why schools choose POP Learning</h2>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                Everything you need to nurture employability skills in every classroom—no extra prep required.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <Card
                    key={benefit.title}
                    className="group h-full border border-base-300/60 bg-base-100/90 shadow-xl shadow-primary/10 transition hover:-translate-y-1 hover:shadow-primary/30"
                  >
                    <CardHeader className="space-y-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:scale-105">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <CardTitle className="text-xl font-semibold text-foreground">{benefit.title}</CardTitle>
                      <CardDescription className="text-base text-muted-foreground">
                        {benefit.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2.5rem] border border-base-300/60 bg-base-100/90 p-10 shadow-[0_45px_120px_-70px_rgba(79,70,229,0.6)]">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">Built for every stakeholder</h3>
                <p className="text-base text-muted-foreground">
                  POP connects administrators, teachers, and students with a shared growth language. AI-curated lessons,
                  gamified cohorts, and real-time reporting keep everyone aligned on essential-skill mastery.
                </p>
              </div>
              <div className="grid gap-4 text-sm text-muted-foreground">
                <div className="rounded-2xl border border-base-300/60 bg-base-100/90 p-4 shadow-sm">
                  <p className="font-semibold text-foreground">District leaders</p>
                  <p>Unlock clear ROI with dashboards that showcase readiness gains across every campus.</p>
                </div>
                <div className="rounded-2xl border border-base-300/60 bg-base-100/90 p-4 shadow-sm">
                  <p className="font-semibold text-foreground">Teachers &amp; coaches</p>
                  <p>Launch curated playlists in minutes and monitor classroom engagement at a glance.</p>
                </div>
                <div className="rounded-2xl border border-base-300/60 bg-base-100/90 p-4 shadow-sm">
                  <p className="font-semibold text-foreground">Students</p>
                  <p>Earn micro-credentials, build interview confidence, and bring positivity into every team.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2.5rem] border border-primary/30 bg-gradient-to-br from-primary/15 via-base-100/90 to-secondary/15 p-10 shadow-[0_45px_120px_-70px_rgba(79,70,229,0.5)]">
            <div className="flex flex-col gap-6 text-center sm:text-left sm:items-center sm:justify-between sm:gap-8 md:flex-row">
              <div className="max-w-xl space-y-3">
                <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">Ready to launch POP for your learners?</h3>
                <p className="text-base text-muted-foreground">
                  Get started in minutes with instant access to the full platform, plug-and-play lesson plans, and a pilot
                  playbook you can run this semester.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button asChild className="shadow-lg shadow-primary/20">
                  <Link href="/signin" className="gap-2">
                    Log in
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="border-primary/40 bg-base-100/70 backdrop-blur">
                  <Link href="/signup" className="gap-2">
                    Book a demo
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="border-t border-base-300/70 bg-base-100/80 py-10 text-muted-foreground backdrop-blur">
        <div className="container mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm lg:flex-row lg:px-10">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground/80">Built by the POP Initiative</p>
          <nav className="flex items-center gap-6">
            <Link href="https://www.linkedin.com/company/pop-initiative" className="transition hover:text-primary" target="_blank" rel="noreferrer">
              LinkedIn
            </Link>
            <Link href="https://twitter.com/POPinitiative" className="transition hover:text-primary" target="_blank" rel="noreferrer">
              X (Twitter)
            </Link>
            <Link href="mailto:hello@poplearning.com" className="transition hover:text-primary">
              hello@poplearning.com
            </Link>
          </nav>
        </div>
      </footer>
    </PageFadeIn>
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
      <button
        type="button"
        onClick={onDismiss}
        className="btn btn-ghost btn-sm rounded-full px-3 text-xs font-semibold uppercase tracking-wide"
        aria-label="Dismiss notification"
      >
        Dismiss
      </button>
    </div>
  );
}
