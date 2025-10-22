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
        <section className="flex flex-col items-center gap-6 rounded-3xl border border-primary/30 bg-primary/10 px-8 py-16 text-center shadow-[0_30px_80px_-45px_rgba(56,189,248,0.45)] backdrop-blur dark:border-primary/40 dark:bg-primary/15">
          <span className="rounded-full border border-primary/40 bg-secondary/10 px-4 py-1 text-sm font-semibold uppercase tracking-wide text-slate-200 dark:bg-secondary/20">
            Workforce readiness reimagined
          </span>
          <h1 className="max-w-3xl text-slate-100 sm:text-5xl">
            Essential Skills. Positive People. Powerful Teams.
          </h1>
          <div className="prose prose-lg max-w-2xl text-slate-300 prose-p:leading-relaxed prose-a:text-primary dark:text-slate-200">
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

        <section className="space-y-6 rounded-3xl border border-secondary/30 bg-secondary/10 px-6 py-10 shadow-[0_25px_60px_-40px_rgba(129,140,248,0.45)] backdrop-blur dark:border-secondary/40 dark:bg-secondary/15">
          <div className="text-center">
            <h2 className="text-slate-100">Why schools choose POP Learning</h2>
            <div className="prose prose-sm mx-auto mt-3 max-w-2xl text-slate-300 dark:text-slate-200">
              <p>Everything you need to nurture employability skills in every classroom.</p>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="h-full">
                <CardHeader>
                  <CardTitle>{benefit.title}</CardTitle>
                  <CardDescription className="prose prose-sm text-slate-300 prose-p:m-0 dark:text-slate-200">
                    {benefit.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-primary/35 bg-primary/15 px-8 py-12 text-center text-slate-100 shadow-[0_25px_60px_-40px_rgba(56,189,248,0.6)] backdrop-blur dark:border-primary/40 dark:bg-primary/20">
          <h2>Who it&apos;s for</h2>
          <div className="prose prose-lg mx-auto mt-4 max-w-2xl text-slate-200">
            <p>
              Built in partnership with high schools and CTE programs preparing students for the future of work.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-secondary/30 bg-secondary/10 px-6 py-8 text-center shadow-[0_20px_50px_-40px_rgba(129,140,248,0.45)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:text-left dark:border-secondary/40 dark:bg-secondary/20">
          <div className="space-y-2">
            <h3 className="text-slate-100">Ready to launch POP for your learners?</h3>
            <div className="prose prose-sm max-w-xl text-slate-300 dark:text-slate-200">
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
