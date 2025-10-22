"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type EmailSignInFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

type EmailSignInFormProps = {
  action: (state: EmailSignInFormState, formData: FormData) => Promise<EmailSignInFormState>;
  initialState: EmailSignInFormState;
  disabled?: boolean;
};

export function EmailSignInForm({ action, initialState, disabled }: EmailSignInFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isDisabled = disabled || pending;

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 text-left">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@organization.org"
          autoComplete="email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={isDisabled}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isDisabled}>
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </span>
        ) : (
          "Send magic link"
        )}
      </Button>
      {state.message ? (
        <p
          className={`text-sm ${state.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
          role={state.status === "error" ? "alert" : undefined}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
