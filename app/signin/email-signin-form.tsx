"use client";

import { useActionState, useId } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const messageId = useId();
  const describedBy = state.message ? messageId : undefined;
  const isError = state.status === "error";

  return (
    <form action={formAction} className="flex w-full flex-col gap-3 text-left">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Work email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@organization.org"
          autoComplete="email"
          disabled={isDisabled}
          aria-invalid={isError || undefined}
          aria-describedby={describedBy}
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
          id={messageId}
          className={`text-sm ${state.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
          role={state.status === "error" ? "alert" : undefined}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
