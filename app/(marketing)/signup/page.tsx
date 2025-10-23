import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageFadeIn } from "@/components/layout/page-fade-in";

export default function SignupPage() {
  return (
    <PageFadeIn className="min-h-screen bg-slate-950 text-slate-50">
      <div className="relative flex min-h-screen items-center justify-center px-6 py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950 via-slate-950/90 to-slate-950" aria-hidden />
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
            Start your trial
          </span>
          <h1 className="text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl">
            POP Learning for your classrooms
          </h1>
          <p className="max-w-2xl text-pretty text-base text-slate-300 sm:text-lg">
            We're onboarding districts and partners in waves. Sign in to explore the product or reach out to our team to schedule a live walkthrough and discuss pricing.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/signin" className="gap-2">
                Log in with Google
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="mailto:hello@poplearning.com" className="gap-2">
                Contact sales
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageFadeIn>
  );
}
