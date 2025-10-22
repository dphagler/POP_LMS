'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, BarChart3, GraduationCap, Sparkles, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageFadeIn } from "@/components/layout/page-fade-in";

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

export default function MarketingPage() {
  return (
    <PageFadeIn className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50" role="main">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute left-1/2 top-32 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-400/60 via-fuchsia-400/50 to-amber-300/40 blur-3xl"
          initial={{ opacity: 0.4, scale: 0.8 }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.8, 1.05, 0.8] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        <motion.div
          className="absolute right-10 top-10 h-72 w-72 rounded-full bg-gradient-to-tr from-sky-500/30 via-cyan-400/20 to-transparent blur-3xl"
          initial={{ x: 40, opacity: 0.3 }}
          animate={{ x: [40, 0, 40], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 18, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 py-16 lg:px-10">
          <section className="relative flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center">
            <motion.span
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 shadow-lg backdrop-blur"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Workforce readiness reimagined
            </motion.span>

            <motion.h1
              className="max-w-4xl bg-gradient-to-r from-sky-300 via-fuchsia-300 to-amber-200 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
            >
              Essential skills for every learner. Confidence for every team.
            </motion.h1>

            <motion.p
              className="max-w-2xl text-lg text-slate-300 sm:text-xl"
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

          <section className="rounded-3xl border border-slate-800/60 bg-white/5 p-10 shadow-[0_30px_80px_-45px_rgba(14,165,233,0.45)] backdrop-blur">
            <div className="space-y-4 text-center">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">Why schools choose POP Learning</h2>
              <p className="mx-auto max-w-2xl text-base text-slate-300 sm:text-lg">
                Everything you need to nurture employability skills in every classroom—no extra prep required.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <Card
                    key={benefit.title}
                    className="group h-full border-slate-800/60 bg-slate-900/60 transition-transform duration-300 hover:scale-[1.03] hover:border-sky-400/50 hover:shadow-[0_20px_50px_-40px_rgba(56,189,248,0.75)]"
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-sky-200">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <CardTitle>{benefit.title}</CardTitle>
                      <CardDescription className="text-slate-300">
                        {benefit.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800/60 bg-white/5 px-8 py-14 text-center shadow-[0_25px_60px_-40px_rgba(56,189,248,0.6)] backdrop-blur">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Who it&apos;s for</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              Built in partnership with high schools and CTE programs preparing students for the future of work.
              POP Learning supports district leaders, teachers, and students with curated resources at every stage.
            </p>
          </section>

          <section className="flex flex-col gap-6 rounded-3xl border border-slate-800/60 bg-gradient-to-br from-sky-500/10 via-slate-900/60 to-fuchsia-500/10 px-8 py-10 text-center shadow-[0_20px_50px_-40px_rgba(129,140,248,0.45)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-white sm:text-3xl">Ready to launch POP for your learners?</h3>
              <p className="max-w-xl text-base text-slate-300">
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
          </section>
        </div>
      </div>

      <footer className="border-t border-white/10 bg-black/40 py-10 text-slate-300 backdrop-blur">
        <div className="container mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm lg:flex-row lg:px-10">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Built by the POP Initiative</p>
          <nav className="flex items-center gap-6">
            <Link href="https://www.linkedin.com/company/pop-initiative" className="transition hover:text-slate-100" target="_blank" rel="noreferrer">
              LinkedIn
            </Link>
            <Link href="https://twitter.com/POPinitiative" className="transition hover:text-slate-100" target="_blank" rel="noreferrer">
              X (Twitter)
            </Link>
            <Link href="mailto:hello@poplearning.com" className="transition hover:text-slate-100">
              hello@poplearning.com
            </Link>
          </nav>
        </div>
      </footer>
    </PageFadeIn>
  );
}
