"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ChangePasswordFormState } from "./actions";

type ChangePasswordFormProps = {
  action: (state: ChangePasswordFormState, formData: FormData) => Promise<ChangePasswordFormState>;
  initialState: ChangePasswordFormState;
};

export function ChangePasswordForm({ action, initialState }: ChangePasswordFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const messageId = useId();
  const hasMessage = Boolean(state.message);
  const isError = state.status === "error";
  const describedBy = hasMessage ? messageId : undefined;

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          Current password
        </label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          disabled={pending}
          aria-invalid={isError || undefined}
          aria-describedby={describedBy}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium">
          New password
        </label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          disabled={pending}
          aria-invalid={isError || undefined}
          aria-describedby={describedBy}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm new password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          disabled={pending}
          aria-invalid={isError || undefined}
          aria-describedby={describedBy}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Change password"
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
