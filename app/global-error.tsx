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
      <body className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 font-sans text-sm leading-6 text-slate-200">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
          <div className="rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1 text-sm font-medium uppercase tracking-wide text-slate-200">
            Something went wrong
          </div>
          <h1 className="text-balance">We hit a snag loading this page.</h1>
          <p className="text-balance text-slate-300">
            Our team has been notified. You can try again, or head back to the dashboard while we sort things
            out.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              onClick={reset}
              variant="secondary"
              className="border-secondary/40 bg-secondary/10 text-slate-200 hover:border-secondary/60 hover:bg-secondary/15"
            >
              Try again
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-slate-200/30 text-slate-200 hover:border-slate-200/50 hover:bg-slate-200/10"
            >
              <Link href="/">Go home</Link>
            </Button>
          </div>
          {error?.digest ? (
            <p className="text-xs text-slate-500">Error reference: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
