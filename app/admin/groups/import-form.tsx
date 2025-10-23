"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { ImportResultState } from "./actions";

const initialState: ImportResultState = {
  errors: []
};

type ImportMembersFormProps = {
  groupId: string;
  action: (state: ImportResultState, formData: FormData) => Promise<ImportResultState>;
  compact?: boolean;
};

export default function ImportMembersForm({ groupId, action, compact = false }: ImportMembersFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fileInputId = useId();
  const instructionsId = useId();
  const errorMessageId = useId();

  const layoutClass = compact
    ? "flex flex-col gap-2 sm:flex-row sm:items-center"
    : "flex flex-col gap-3 sm:flex-row sm:items-center";

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [state.success]);

  const describedByIds = [instructionsId];
  if (state.formError) {
    describedByIds.push(errorMessageId);
  }
  const describedBy = describedByIds.join(" ") || undefined;

  return (
    <div className="space-y-3">
      <form ref={formRef} action={formAction} encType="multipart/form-data" className="space-y-3">
        <input type="hidden" name="groupId" value={groupId} />
        <div className={cn(layoutClass, "w-full")}>
          <label htmlFor={fileInputId} className="sr-only">
            Upload member list CSV
          </label>
          <Input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            disabled={isPending}
            aria-describedby={describedBy}
            aria-invalid={state.formError ? true : undefined}
          />
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Importing…
              </span>
            ) : (
              "Import CSV"
            )}
          </Button>
        </div>
        <p id={instructionsId} className="text-xs text-muted-foreground">
          Upload a CSV with <code>email</code> and <code>name</code> columns. Existing users and memberships
          will be reused automatically.
        </p>
      </form>
      {state.formError ? (
        <div id={errorMessageId} role="alert" className="alert alert-error">
          <span>{state.formError}</span>
        </div>
      ) : null}
      {state.success ? (
        <div className="alert alert-success flex-col items-start gap-2 text-sm">
          <p className="font-medium">Import complete</p>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            <li>
              Processed {state.success.totalRows} row{state.success.totalRows === 1 ? "" : "s"}.
            </li>
            <li>Created {state.success.createdUsers} new user{state.success.createdUsers === 1 ? "" : "s"}.</li>
            <li>Updated {state.success.updatedUsers} user name{state.success.updatedUsers === 1 ? "" : "s"}.</li>
            <li>Added {state.success.addedMemberships} membership{state.success.addedMemberships === 1 ? "" : "s"}.</li>
            <li>Skipped {state.success.skippedRows} row{state.success.skippedRows === 1 ? "" : "s"} due to errors or duplicates.</li>
          </ul>
        </div>
      ) : null}
      {state.errors.length > 0 ? (
        <div className="alert alert-warning flex-col items-start gap-2 text-sm">
          <p className="font-medium">Rows with issues</p>
          <ul className="space-y-1">
            {state.errors.map((error) => (
              <li key={`${error.rowNumber}-${error.email}`}>
                Row {error.rowNumber}: {error.email ? <span className="font-medium">{error.email}</span> : "(missing email)"}
                {" — "}
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
