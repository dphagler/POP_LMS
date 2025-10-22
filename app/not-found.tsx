import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="rounded-full bg-neutral-100 px-4 py-1 text-sm font-medium uppercase tracking-wide text-neutral-500">
        404
      </div>
      <h1 className="text-3xl font-semibold text-neutral-900 sm:text-4xl">We can’t seem to find that page.</h1>
      <p className="max-w-md text-neutral-600">
        The page may have moved or no longer exists. Check the URL or return to the dashboard to continue learning.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/60"
        >
          Go to dashboard
        </Link>
        <Link
          href="/app"
          className="rounded-md border border-neutral-300 px-5 py-2 text-sm font-semibold text-neutral-900 transition hover:border-neutral-400 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20"
        >
          Browse courses
        </Link>
      </div>
    </div>
  );
}
