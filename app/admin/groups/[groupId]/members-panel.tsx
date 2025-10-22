"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type GroupMemberDisplay = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  isPending?: boolean;
};

type MembersPanelProps = {
  groupId: string;
  groupName: string;
  initialMembers: GroupMemberDisplay[];
};

type ExistingSuggestion = {
  type: "existing";
  id: string;
  email: string;
  name: string | null;
};

type InviteSuggestion = {
  type: "invite";
  email: string;
  displayEmail: string;
  name: string | null;
};

type Suggestion = ExistingSuggestion | InviteSuggestion;

type ToastState = {
  variant: "success" | "error";
  title: string;
  description?: string;
};

type AddMemberResponse = {
  member: {
    membershipId: string;
    userId: string;
    email: string;
    name: string | null;
  };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

function sortMembers(members: GroupMemberDisplay[]): GroupMemberDisplay[] {
  return [...members].sort((a, b) => {
    const left = a.name?.toLocaleLowerCase() ?? a.email.toLocaleLowerCase();
    const right = b.name?.toLocaleLowerCase() ?? b.email.toLocaleLowerCase();
    return left.localeCompare(right, undefined, { sensitivity: "base" });
  });
}

function getDisplayName(member: { name: string | null; email: string }): string {
  return member.name?.trim() || member.email;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function MembersPanel({ groupId, groupName, initialMembers }: MembersPanelProps) {
  const [members, setMembers] = useState<GroupMemberDisplay[]>(() => sortMembers(initialMembers));
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ExistingSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastState | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      abortController.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const trimmed = query.trim();

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (trimmed.length < SEARCH_MIN_LENGTH) {
      setSuggestions([]);
      setIsSearching(false);
      abortController.current?.abort();
      return;
    }

    setIsSearching(true);
    debounceTimer.current = setTimeout(async () => {
      abortController.current?.abort();
      const controller = new AbortController();
      abortController.current = controller;

      try {
        const response = await fetch(
          `/admin/groups/${groupId}/members/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }
        const payload = (await response.json()) as { users: Array<{ id: string; email: string; name: string | null }> };
        const existingEmails = new Set(
          members.map((member) => member.email.trim().toLocaleLowerCase())
        );
        setSuggestions(
          payload.users
            .filter((user) => !existingEmails.has(user.email.trim().toLocaleLowerCase()))
            .map((user) => ({
              type: "existing" as const,
              id: user.id,
              email: user.email,
              name: user.name,
            }))
        );
      } catch (error) {
        if (!isAbortError(error)) {
          console.error("Failed to search users", error);
          setSuggestions([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
  }, [groupId, members, query]);

  const inviteSuggestion: InviteSuggestion | null = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      return null;
    }
    const normalized = trimmed.toLocaleLowerCase();
    const alreadyMember = members.some((member) => member.email.toLocaleLowerCase() === normalized);
    const alreadySuggested = suggestions.some((suggestion) => suggestion.email.toLocaleLowerCase() === normalized);
    if (alreadyMember || alreadySuggested) {
      return null;
    }
    return {
      type: "invite",
      email: normalized,
      displayEmail: trimmed,
      name: null,
    };
  }, [members, query, suggestions]);

  const combinedSuggestions: Suggestion[] = useMemo(() => {
    const existing = suggestions;
    if (inviteSuggestion) {
      return [...existing, inviteSuggestion];
    }
    return existing;
  }, [inviteSuggestion, suggestions]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    if (suggestion.type === "invite") {
      setQuery(suggestion.displayEmail);
    } else {
      setQuery(suggestion.email);
    }
  };

  const handleAddMember = async () => {
    if (isSubmitting) return;

    const trimmed = query.trim();
    let target: Suggestion | null = selectedSuggestion;

    if (!target) {
      if (inviteSuggestion) {
        target = inviteSuggestion;
      } else if (combinedSuggestions.length === 1) {
        target = combinedSuggestions[0];
      }
    }

    if (!target) {
      setToast({
        variant: "error",
        title: "Choose a user to add",
        description: "Select someone from the list or enter an email address to invite.",
      });
      return;
    }

    if (target.type === "existing" && !trimmed) {
      setQuery(target.email);
    }

    const normalizedEmail = target.type === "invite" ? target.email : target.email.toLocaleLowerCase();
    const alreadyMember = members.find((member) => member.email.toLocaleLowerCase() === normalizedEmail);
    if (alreadyMember && !alreadyMember.isPending) {
      setToast({
        variant: "success",
        title: `${getDisplayName(alreadyMember)} is already in ${groupName}.`,
      });
      setQuery("");
      setSelectedSuggestion(null);
      setSuggestions([]);
      return;
    }

    const optimisticMember: GroupMemberDisplay = {
      membershipId: `temp-${Date.now()}`,
      userId: target.type === "existing" ? target.id : `pending-${Date.now()}`,
      email: target.type === "invite" ? target.displayEmail : target.email,
      name: target.type === "invite" ? target.name : target.name,
      isPending: true,
    };

    setIsSubmitting(true);
    setMembers((prev) => sortMembers([...prev, optimisticMember]));

    try {
      const response = await fetch(`/admin/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          target.type === "existing"
            ? { userId: target.id }
            : { email: target.email, name: target.name ?? undefined }
        ),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload?.error === "string" ? payload.error : "Unable to add member.";
        throw new Error(message);
      }

      const payload = (await response.json()) as AddMemberResponse;
      const addedMember = payload.member;

      setMembers((prev) => {
        const withoutTemp = prev.filter((member) => member.membershipId !== optimisticMember.membershipId);
        const withoutDuplicate = withoutTemp.filter((member) => member.userId !== addedMember.userId);
        return sortMembers([
          ...withoutDuplicate,
          {
            membershipId: addedMember.membershipId,
            userId: addedMember.userId,
            email: addedMember.email,
            name: addedMember.name,
          },
        ]);
      });

      setToast({
        variant: "success",
        title: `Added ${getDisplayName({ name: addedMember.name, email: addedMember.email })} to ${groupName}.`,
      });
      setQuery("");
      setSelectedSuggestion(null);
      setSuggestions([]);
    } catch (error) {
      setMembers((prev) => prev.filter((member) => member.membershipId !== optimisticMember.membershipId));
      const message = error instanceof Error ? error.message : "Unable to add member.";
      setToast({
        variant: "error",
        title: "Could not add member",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: GroupMemberDisplay) => {
    if (pendingRemovals.has(member.membershipId)) {
      return;
    }

    const updatedPending = new Set(pendingRemovals);
    updatedPending.add(member.membershipId);
    setPendingRemovals(updatedPending);

    setMembers((prev) => prev.filter((item) => item.membershipId !== member.membershipId));

    try {
      const response = await fetch(`/admin/groups/${groupId}/members/${member.membershipId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload?.error === "string" ? payload.error : "Unable to remove member.";
        throw new Error(message);
      }

      setToast({
        variant: "success",
        title: `Removed ${getDisplayName(member)} from ${groupName}.`,
      });
    } catch (error) {
      setMembers((prev) => sortMembers([...prev, member]));
      const message = error instanceof Error ? error.message : "Unable to remove member.";
      setToast({
        variant: "error",
        title: "Could not remove member",
        description: message,
      });
    } finally {
      setPendingRemovals((prev) => {
        const next = new Set(prev);
        next.delete(member.membershipId);
        return next;
      });
    }
  };

  const addButtonLabel = selectedSuggestion?.type === "invite" || (!selectedSuggestion && inviteSuggestion)
    ? "Invite & add"
    : "Add member";

  return (
    <Card className="relative h-full">
      {toast ? (
        <div
          role="status"
          className={cn(
            "pointer-events-auto absolute right-4 top-4 z-10 w-full max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg",
            toast.variant === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-current/20 bg-white/70">
              {toast.variant === "success" ? <UserPlus className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
            </div>
            <div className="space-y-1">
              <p className="font-semibold leading-none">{toast.title}</p>
              {toast.description ? (
                <p className="text-xs leading-snug text-muted-foreground">{toast.description}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <CardHeader className="space-y-2 pb-4">
        <CardTitle>Members</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Add existing users or invite new people by email. Changes appear immediately for this group.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <label htmlFor="member-search" className="text-sm font-medium text-foreground">
            Add a member
          </label>
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="member-search"
                placeholder="Search by name or email"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedSuggestion(null);
                }}
                autoComplete="off"
                spellCheck={false}
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            </div>
            {combinedSuggestions.length > 0 || isSearching ? (
              <ul className="max-h-52 overflow-y-auto rounded-md border border-border bg-background text-sm shadow-md">
                {isSearching ? (
                  <li className="flex items-center justify-center gap-2 px-3 py-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Searching…
                  </li>
                ) : null}
                {combinedSuggestions.map((suggestion) => (
                  <li key={suggestion.type === "existing" ? suggestion.id : suggestion.email}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition hover:bg-muted",
                        selectedSuggestion &&
                          ((selectedSuggestion.type === "existing" && suggestion.type === "existing" && selectedSuggestion.id === suggestion.id) ||
                            (selectedSuggestion.type === "invite" && suggestion.type === "invite"))
                          ? "bg-muted"
                          : undefined
                      )}
                    >
                      <span className="font-medium">
                        {suggestion.type === "existing"
                          ? suggestion.name?.trim() || suggestion.email
                          : `Invite ${suggestion.displayEmail}`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {suggestion.type === "existing" ? suggestion.email : "Create a new user and add to this group"}
                      </span>
                    </button>
                  </li>
                ))}
                {combinedSuggestions.length === 0 && !isSearching ? (
                  <li className="px-3 py-2 text-muted-foreground">No matches found.</li>
                ) : null}
              </ul>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleAddMember} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Adding…
                </span>
              ) : (
                addButtonLabel
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQuery("");
                setSelectedSuggestion(null);
                setSuggestions([]);
              }}
              disabled={isSubmitting && !query}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Current members ({members.length})</h3>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet. Add someone to get started.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((member) => (
                <li
                  key={member.membershipId}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.name?.trim() || member.email}
                      {member.isPending ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                          Adding…
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleRemoveMember(member)}
                    disabled={member.isPending || pendingRemovals.has(member.membershipId)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
