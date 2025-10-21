import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-center justify-center space-y-10 p-6 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold sm:text-5xl">POP Initiative LMS Starter</h1>
        <p className="text-lg text-muted-foreground">
          Launch a community-powered learning experience with authentication, video heartbeat
          tracking, Postgres, and Sanity content in minutes.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button asChild>
          <Link href="/signin">Sign in with Google</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="https://www.popcollaborative.org" target="_blank">
            Learn about the POP Initiative
          </Link>
        </Button>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Production Ready</CardTitle>
            <CardDescription>Auth.js, Prisma, and Vercel Postgres configured from day one.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Video Native</CardTitle>
            <CardDescription>YouTube heartbeat tracking keeps learners honest and engaged.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Content-led</CardTitle>
            <CardDescription>Sanity CMS models map cleanly to courses, modules, and lessons.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
