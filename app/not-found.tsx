import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1 text-sm font-medium uppercase tracking-wide text-slate-200">
        404
      </div>
      <h1 className="text-balance">We can’t seem to find that page.</h1>
      <p className="max-w-md text-balance">
        The page may have moved or no longer exists. Check the URL or return to the dashboard to continue learning.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Go to dashboard
        </Link>
        <Link
          href="/app"
          className="rounded-md border border-secondary/40 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-secondary/60 hover:bg-secondary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
        >
          Browse courses
        </Link>
      </div>
    </div>
  );
}
