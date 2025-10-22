"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { captureError } from "@/lib/client-error-reporting";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, {
      event: "app.unhandled_error",
      properties: {
        digest: error?.digest
      }
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
            <Button
              type="button"
              onClick={reset}
              variant="secondary"
              className="bg-white text-neutral-900 hover:bg-neutral-200 focus-visible:ring-white/70 focus-visible:ring-offset-neutral-950"
            >
              Try again
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-white/40 text-white hover:border-white hover:bg-white/10 focus-visible:ring-white/70 focus-visible:ring-offset-neutral-950"
            >
              <Link href="/">Go home</Link>
            </Button>
          </div>
          {error?.digest ? (
            <p className="text-xs text-neutral-500">Error reference: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
