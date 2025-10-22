"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { ImportResultState } from "./actions";

const initialState: ImportResultState = {
  errors: []
};

type ImportMembersFormProps = {
  groupId: string;
  action: (state: ImportResultState, formData: FormData) => Promise<ImportResultState>;
};

export default function ImportMembersForm({ groupId, action }: ImportMembersFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [state.success]);

  return (
    <div className="space-y-3">
      <form
        ref={formRef}
        action={formAction}
        encType="multipart/form-data"
        className="space-y-3"
      >
        <input type="hidden" name="groupId" value={groupId} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Importing..." : "Import CSV"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a CSV with <code>email</code> and <code>name</code> columns. Existing users and memberships
          will be reused automatically.
        </p>
      </form>
      {state.formError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.formError}
        </p>
      ) : null}
      {state.success ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm">
          <p className="font-medium">Import complete</p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
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
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <p className="font-medium">Rows with issues</p>
          <ul className="mt-1 space-y-1">
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
