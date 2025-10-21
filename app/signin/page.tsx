import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

type SignInSearchParams = { callbackUrl?: string };

type SignInPageProps = {
  searchParams?: Promise<SignInSearchParams>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await auth();
  if (session?.user) {
    redirect(resolvedSearchParams?.callbackUrl ?? "/app");
  }

  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: resolvedSearchParams?.callbackUrl ?? "/app" });
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <form action={handleSignIn} className="flex max-w-sm flex-col items-center gap-6 rounded-lg border bg-card p-8 text-center">
        <Image src="/logo.svg" alt="POP Initiative" width={80} height={80} className="rounded-full" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Use your POP Initiative Google account to continue.</p>
        </div>
        <Button type="submit" className="w-full">
          Continue with Google
        </Button>
      </form>
    </div>
  );
}
