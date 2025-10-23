import Image from "next/image";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PageFadeIn } from "@/components/layout/page-fade-in";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth, signIn } from "@/lib/auth";
import { env } from "@/lib/env";
import { EmailSignInForm, type EmailSignInFormState } from "./email-signin-form";

type SignInSearchParams = { callbackUrl?: string };

type SignInPageProps = {
  searchParams?: Promise<SignInSearchParams>;
};

const emailSchema = z.string().trim().email();

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await auth();
  if (session?.user) {
    redirect(resolvedSearchParams?.callbackUrl ?? "/app");
  }

  const emailAuthEnabled = env.AUTH_EMAIL_ENABLED && Boolean(env.RESEND_API_KEY) && Boolean(env.AUTH_EMAIL_FROM);

  async function handleGoogleSignIn() {
    "use server";
    await signIn("google", { redirectTo: resolvedSearchParams?.callbackUrl ?? "/app" });
  }

  async function handleEmailSignIn(
    _prevState: EmailSignInFormState,
    formData: FormData
  ): Promise<EmailSignInFormState> {
    "use server";

    if (!emailAuthEnabled) {
      return {
        status: "error",
        message: "Email sign-in is currently disabled."
      } satisfies EmailSignInFormState;
    }

    const rawEmail = formData.get("email");
    if (typeof rawEmail !== "string") {
      return {
        status: "error",
        message: "Enter a valid email address."
      } satisfies EmailSignInFormState;
    }

    const parsedEmail = emailSchema.safeParse(rawEmail);
    if (!parsedEmail.success) {
      return {
        status: "error",
        message: "Enter a valid email address."
      } satisfies EmailSignInFormState;
    }

    const normalizedEmail = parsedEmail.data.toLowerCase();

    try {
      const result = await signIn("email", {
        email: normalizedEmail,
        redirect: false,
        redirectTo: resolvedSearchParams?.callbackUrl ?? "/app"
      });

      if (result?.error) {
        const message = result.error.toString();
        return {
          status: "error",
          message: normalizeEmailErrorMessage(message)
        } satisfies EmailSignInFormState;
      }

      return {
        status: "success",
        message: "Check your email for a magic link to continue."
      } satisfies EmailSignInFormState;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send magic link.";
      return {
        status: "error",
        message: normalizeEmailErrorMessage(message)
      } satisfies EmailSignInFormState;
    }
  }

  const initialEmailState: EmailSignInFormState = { status: "idle" };

  return (
    <PageFadeIn
      className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-gradient-to-br from-white via-base-100 to-base-200"
      role="main"
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-16 top-10 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-72 w-72 translate-x-1/3 rounded-full bg-secondary/15 blur-3xl" />
      </div>
      <PageContainer className="flex justify-center">
        <Card className="w-full max-w-md border border-base-300/60 bg-base-100/90 shadow-[0_35px_90px_-50px_rgba(79,70,229,0.6)] backdrop-blur">
          <CardContent className="flex flex-col items-center gap-7 p-10 text-center">
            <Image src="/logo.svg" alt="POP Initiative" width={80} height={80} className="rounded-full" />
          <div className="space-y-3">
            <h1 className="text-balance text-2xl font-semibold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Choose how you’d like to sign in to your POP Initiative account. Your progress syncs across web and mobile.
            </p>
          </div>
          <form action={handleGoogleSignIn} className="w-full">
            <Button type="submit" className="w-full shadow-md shadow-primary/20">
              Continue with Google
            </Button>
          </form>
          {emailAuthEnabled ? (
            <div className="w-full space-y-4 text-left">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Or use a magic link</p>
                <p className="text-xs text-muted-foreground">
                  We’ll email you a single-use link that expires shortly after it’s sent.
                </p>
              </div>
              <EmailSignInForm action={handleEmailSignIn} initialState={initialEmailState} />
            </div>
          ) : null}
          {!emailAuthEnabled ? (
            <p className="w-full text-left text-xs text-muted-foreground">
              Email sign-in is not available for this environment. Contact your administrator if you need access.
            </p>
          ) : null}
          <div className="w-full rounded-2xl border border-dashed border-base-300/70 bg-base-100/70 p-4 text-left text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Need an invite?</p>
            <p>Reach out to your program admin to get connected to POP Initiative.</p>
          </div>
        </CardContent>
        </Card>
      </PageContainer>
    </PageFadeIn>
  );
}

function normalizeEmailErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("rate") || normalized.includes("limit")) {
    return "Too many requests. Try again in a few minutes.";
  }

  if (normalized.includes("disabled")) {
    return "Email sign-in is currently disabled.";
  }

  return "We couldn’t send the magic link. Please try again.";
}
