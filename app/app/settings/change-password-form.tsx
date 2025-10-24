"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
    <form ref={formRef} action={formAction} className="space-y-5">
      <div className="form-control">
        <label htmlFor="currentPassword" className="label">
          <span className="label-text font-semibold">Current password</span>
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
      <div className="form-control">
        <label htmlFor="newPassword" className="label">
          <span className="label-text font-semibold">New password</span>
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
      <div className="form-control">
        <label htmlFor="confirmPassword" className="label">
          <span className="label-text font-semibold">Confirm new password</span>
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
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Saving…
          </span>
        ) : (
          "Change password"
        )}
      </Button>
      {state.message ? (
        <div
          id={messageId}
          className={cn(
            "alert shadow-sm",
            state.status === "error" ? "alert-error" : "alert-success"
          )}
          role={state.status === "error" ? "alert" : "status"}
          aria-live={state.status === "error" ? "assertive" : "polite"}
        >
          <span>{state.message}</span>
        </div>
      ) : null}
    </form>
  );
}
