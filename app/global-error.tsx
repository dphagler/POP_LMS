"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/lib/client-error-reporting";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("app.unhandled_error", error, {
      digest: error?.digest
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-16 text-neutral-100">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-neutral-800/70 px-4 py-1 text-sm font-medium uppercase tracking-wide text-neutral-300">
            Something went wrong
          </div>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">We hit a snag loading this page.</h1>
          <p className="text-neutral-300">
            Our team has been notified. You can try again, or head back to the dashboard while we sort things
            out.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-white px-5 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-md border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Go home
            </Link>
          </div>
          {error?.digest ? (
            <p className="text-xs text-neutral-500">Error reference: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
