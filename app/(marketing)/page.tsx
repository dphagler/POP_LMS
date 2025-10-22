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
    <main className="flex min-h-screen flex-col bg-white text-slate-900">
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-6 pb-12 pt-24 text-center sm:pt-28">
        <span className="rounded-full bg-slate-100 px-4 py-1 text-sm font-semibold text-slate-600">
          Workforce readiness reimagined
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Essential Skills. Positive People. Powerful Teams.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 sm:text-xl">
          AI-guided, video-based micro-learning that builds communication, collaboration, and work
          ethic—fast.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/signin">Log in</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">Why schools choose POP Learning</h2>
            <p className="mt-2 text-slate-600">
              Everything you need to nurture employability skills in every classroom.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="h-full border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-slate-900">
                    {benefit.title}
                  </CardTitle>
                  <CardDescription className="text-base text-slate-600">
                    {benefit.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="rounded-3xl bg-slate-900 px-8 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-semibold sm:text-3xl">Who it&apos;s for</h2>
          <p className="mt-4 text-lg text-slate-200">
            Built in partnership with high schools and CTE programs preparing students for the
            future of work.
          </p>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Ready to launch POP for your learners?</h3>
            <p className="text-slate-600">Get started in minutes with instant access to the full platform.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/signin">Log in</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 py-10 text-slate-100">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
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
