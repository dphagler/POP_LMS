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
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-base-100 via-base-100/95 to-base-200 text-foreground"
      role="main"
    >
      <SignedOutToast message={toastMessage} onDismiss={dismissToast} />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute left-1/2 top-32 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/45 via-accent/35 to-warning/30 blur-3xl"
          initial={{ opacity: 0.4, scale: 0.8 }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.8, 1.05, 0.8] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <motion.div
          className="absolute right-10 top-10 h-72 w-72 rounded-full bg-gradient-to-tr from-secondary/40 via-info/30 to-transparent blur-3xl"
          initial={{ x: 40, opacity: 0.3 }}
          animate={{ x: [40, 0, 40], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 18, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 py-16 lg:px-10">
          <section className="relative flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center">
            <motion.span
              className="badge badge-outline badge-primary badge-lg gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.32em]"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Workforce readiness reimagined
            </motion.span>

            <motion.h1
              className="max-w-4xl bg-gradient-to-r from-primary via-accent to-warning bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
            >
              Essential skills for every learner. Confidence for every team.
            </motion.h1>

            <motion.p
              className="max-w-2xl text-lg text-muted-foreground sm:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
            >
              POP Learning blends AI guidance, micro-learning, and real classroom feedback to help students build
              communication, collaboration, and work ethic—fast.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              <Button size="lg" asChild>
                <Link href="/signin" className="gap-2">
                  Log in
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/signup" className="gap-2">
                  Start free trial
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>
          </section>

          <section className="card bg-base-100 shadow-xl">
            <div className="card-body gap-8 text-center">
              <div className="space-y-4">
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
                      className="group h-full border border-base-200 bg-base-100 shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
                    >
                      <CardHeader className="space-y-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <CardTitle>{benefit.title}</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          {benefit.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="card bg-base-100 shadow-xl">
            <div className="card-body items-center gap-4 text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Who it&apos;s for</h2>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
                Built in partnership with high schools and CTE programs preparing students for the future of work.
                POP Learning supports district leaders, teachers, and students with curated resources at every stage.
              </p>
            </div>
          </section>

          <section className="card bg-gradient-to-br from-primary/10 via-base-100 to-accent/10 shadow-2xl">
            <div className="card-body gap-6 sm:flex sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="space-y-3 text-center sm:text-left">
                <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">Ready to launch POP for your learners?</h3>
                <p className="max-w-xl text-base text-muted-foreground">
                  Get started in minutes with instant access to the full platform and plug-and-play lesson plans.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button asChild>
                  <Link href="/signin" className="gap-2">
                    Log in
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
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

      <footer className="border-t border-base-300 bg-base-100/85 py-10 text-muted-foreground backdrop-blur">
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
      className="pointer-events-auto fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-base-300 bg-base-100/95 px-4 py-2 text-sm font-medium text-foreground shadow-xl backdrop-blur"
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
