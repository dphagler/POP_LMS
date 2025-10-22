import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const benefits = [
  {
    title: "Micro-learning videos",
    description:
      "Short, cinematic lessons make it easy for students to learn essential professional habits.",
  },
  {
    title: "Gamification & credentials",
    description:
      "Leaderboards, streaks, and verified certificates motivate learners to keep leveling up.",
  },
  {
    title: "Growth dashboards",
    description:
      "Real-time insights show teachers exactly how cohorts are progressing week over week.",
  },
  {
    title: "Interview practice",
    description:
      "Guided prompts help learners rehearse answers and build confidence before the big day.",
  },
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen">
      <div className="container mx-auto max-w-6xl space-y-6 py-10 px-6 lg:px-10">
        <section className="flex flex-col items-center gap-6 rounded-3xl border border-slate-200/10 bg-white/40 px-8 py-16 text-center shadow-[0_30px_80px_-45px_rgba(15,23,42,0.65)] backdrop-blur dark:bg-slate-900/30">
          <span className="rounded-full border border-slate-200/40 bg-white/80 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-200">
            Workforce readiness reimagined
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Essential Skills. Positive People. Powerful Teams.
          </h1>
          <div className="prose prose-lg text-slate-600 prose-p:leading-relaxed prose-a:text-primary max-w-2xl dark:text-slate-200">
            <p>
              AI-guided, video-based micro-learning that builds communication, collaboration, and work
              ethic—fast.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signin">Log in</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-slate-200/10 bg-white/40 px-6 py-10 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur dark:bg-slate-900/30">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Why schools choose POP Learning</h2>
            <div className="prose prose-sm mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-200">
              <p>Everything you need to nurture employability skills in every classroom.</p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="h-full">
                <CardHeader>
                  <CardTitle>{benefit.title}</CardTitle>
                  <CardDescription className="prose prose-sm text-slate-200/90 prose-p:m-0">
                    {benefit.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/10 bg-slate-900/80 px-8 py-12 text-center text-white shadow-[0_25px_60px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
          <h2 className="text-3xl font-semibold tracking-tight">Who it&apos;s for</h2>
          <div className="prose prose-lg mx-auto mt-4 max-w-2xl text-slate-200">
            <p>
              Built in partnership with high schools and CTE programs preparing students for the future of work.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/10 bg-white/50 px-6 py-8 text-center shadow-[0_20px_50px_-40px_rgba(15,23,42,0.55)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:text-left dark:bg-slate-900/30">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Ready to launch POP for your learners?</h3>
            <div className="prose prose-sm text-slate-600 max-w-xl dark:text-slate-200">
              <p>Get started in minutes with instant access to the full platform.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/signin">Log in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-200/10 bg-slate-950/80 py-10 text-slate-200 backdrop-blur">
        <div className="container mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 lg:px-10 sm:flex-row">
          <p className="text-sm">© {new Date().getFullYear()} POP Learning. All rights reserved.</p>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/about" className="transition hover:text-white">
              About
            </Link>
            <Link href="#" className="transition hover:text-white">
              Pricing
            </Link>
            <Link href="mailto:hello@poplearning.com" className="transition hover:text-white">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
