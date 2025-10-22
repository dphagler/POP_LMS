"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { type UpdateProfileFormState } from "./actions";
import { SettingsToast, type SettingsToastMessage } from "./settings-toast";

type ProfileSettingsFormProps = {
  action: (
    state: UpdateProfileFormState,
    formData: FormData
  ) => Promise<UpdateProfileFormState>;
  initialState: UpdateProfileFormState;
  initialName: string;
  initialEmail: string;
  initialAvatar?: string | null;
};

export function ProfileSettingsForm({
  action,
  initialState,
  initialName,
  initialEmail,
  initialAvatar = null,
}: ProfileSettingsFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [displayName, setDisplayName] = useState(initialName);
  const [savedAvatar, setSavedAvatar] = useState<string | null>(initialAvatar);
  const [preview, setPreview] = useState<string | null>(initialAvatar);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [toast, setToast] = useState<SettingsToastMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const avatarInputId = useId();
  const avatarDescriptionId = useId();
  const displayNameHelpId = useId();
  const successMessageId = useId();
  const errorMessageId = useId();

  useEffect(() => {
    setDisplayName(initialName);
  }, [initialName]);

  useEffect(() => {
    setSavedAvatar(initialAvatar ?? null);
    setPreview(initialAvatar ?? null);
    setRemoveAvatar(false);
  }, [initialAvatar]);

  useEffect(() => {
    if (state.status === "idle") {
      return;
    }

    if (state.status === "success") {
      setToast({
        variant: "success",
        title: "Profile updated",
        description: state.message ?? "Your changes have been saved.",
      });
      if (typeof state.name === "string") {
        setDisplayName(state.name);
      }
      if (typeof state.image !== "undefined") {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        setPreview(state.image);
        setSavedAvatar(state.image ?? null);
        setRemoveAvatar(!state.image);
        if (!state.image && fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }

    if (state.status === "error") {
      setToast({
        variant: "error",
        title: "Update failed",
        description: state.message ?? "We couldn’t save your changes. Please try again.",
      });
    }
  }, [state, initialState]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const avatarInitials = useMemo(() => {
    const segments = displayName.split(" ").map((segment) => segment.trim()).filter(Boolean);
    const [first = "", second = ""] = segments;
    const initials = `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
    if (initials) return initials;
    const fallback = displayName.trim().slice(0, 2).toUpperCase();
    return fallback || "PO";
  }, [displayName]);

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setPreview(savedAvatar);
      setRemoveAvatar(false);
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreview(objectUrl);
    setRemoveAvatar(false);
  };

  const handleRemoveAvatar = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreview(null);
    setRemoveAvatar(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const statusIds: string[] = [];
  if (state.status === "success") {
    statusIds.push(successMessageId);
  }
  if (state.status === "error") {
    statusIds.push(errorMessageId);
  }

  const avatarDescribedBy = [avatarDescriptionId, ...statusIds].join(" ") || undefined;
  const displayNameDescribedBy = [displayNameHelpId, ...statusIds].join(" ") || undefined;
  const hasError = state.status === "error";

  return (
    <>
      <form action={formAction} className="space-y-6 p-6">
        <input type="hidden" name="removeAvatar" value={removeAvatar ? "true" : "false"} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar className="h-20 w-20">
            {preview ? <AvatarImage src={preview} alt="Avatar preview" /> : null}
            <AvatarFallback>{avatarInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-base font-semibold">Profile photo</h2>
              <p id={avatarDescriptionId} className="text-sm text-muted-foreground">
                Use a square image (recommended 240px or larger). PNG or JPG files up to 4 MB are supported.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={avatarInputId} className="sr-only">
                Upload profile photo
              </label>
              <Input
                ref={fileInputRef}
                id={avatarInputId}
                name="avatar"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={pending}
                className="min-w-[220px]"
                aria-describedby={avatarDescribedBy}
                aria-invalid={hasError || undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={pending || (!preview && !savedAvatar)}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium">
            Display name
          </label>
          <Input
            id="displayName"
            name="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={80}
            autoComplete="name"
            required
            disabled={pending}
            aria-describedby={displayNameDescribedBy}
            aria-invalid={hasError || undefined}
          />
          <p id={displayNameHelpId} className="text-xs text-muted-foreground">
            This name will appear on certificates and progress reports.
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium">Email</p>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {initialEmail}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div id={successMessageId} aria-live="polite" className="sr-only">
            {state.status === "success" ? state.message : null}
          </div>
          <div id={errorMessageId} aria-live="assertive" className="sr-only">
            {state.status === "error" ? state.message : null}
          </div>
          <Button type="submit" disabled={pending} className="sm:w-auto">
            {pending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </span>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </form>
      <SettingsToast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
