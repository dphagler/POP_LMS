import Link from "next/link";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";

export default async function NotFound() {
  const session = await auth();
  const isSignedIn = Boolean(session?.user?.id);

  return (
    <PageContainer className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1 text-sm font-medium uppercase tracking-wide text-slate-200">
        404
      </div>
      <h1 className="text-balance text-3xl font-semibold">Page not found</h1>
      <p className="max-w-md text-pretty text-base text-muted-foreground">
        The link you followed is no longer available. Double-check the address or choose one of the options below to get back on track.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {isSignedIn ? (
          <Button asChild size="lg">
            <Link href="/app">Go to dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="lg" variant="outline">
            <Link href="/">Go home</Link>
          </Button>
        )}
      </div>
    </PageContainer>
  );
}
