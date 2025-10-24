"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";

import { DataDensityToggle, type DataDensity } from "@/components/admin/data-density-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import ImportMembersForm from "./import-form";
import type { ImportResultState } from "./actions";

type GroupListItem = {
  id: string;
  name: string;
  _count: { members: number };
};

type GroupsListProps = {
  groups: GroupListItem[];
  renameGroup: (formData: FormData) => Promise<void>;
  deleteGroup: (formData: FormData) => Promise<void>;
  importMembers: (state: ImportResultState, formData: FormData) => Promise<ImportResultState>;
};

export default function GroupsList({ groups, renameGroup, deleteGroup, importMembers }: GroupsListProps) {
  const [density, setDensity] = useState<DataDensity>("comfortable");
  const [query, setQuery] = useState("");
  const isCompact = density === "compact";
  const formGap = isCompact ? "flex flex-col gap-2 sm:flex-row sm:items-end" : "flex flex-col gap-3 sm:flex-row sm:items-end";
  const gridLayout = cn("grid", isCompact ? "gap-3 sm:grid-cols-2 xl:grid-cols-3" : "gap-4 sm:grid-cols-2 xl:grid-cols-3");
  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) {
      return groups;
    }

    return groups.filter((group) => group.name.toLocaleLowerCase().includes(normalized));
  }, [groups, query]);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Groups you create will appear here.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <label htmlFor="group-search" className="sr-only">
            Search groups
          </label>
          <Input
            id="group-search"
            type="search"
            placeholder="Search groups"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
          />
        </div>
        <DataDensityToggle density={density} onDensityChange={setDensity} />
      </div>

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No groups match your search.</p>
      ) : (
        <div className={gridLayout}>
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="group relative flex h-full flex-col overflow-hidden border border-base-200 bg-base-100 shadow-xl transition hover:border-primary/40 hover:shadow-2xl"
            >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(140%_85%_at_100%_0%,theme(colors.primary/0.14),transparent_65%)] opacity-0 transition group-hover:opacity-100"
            />
            <CardHeader className="relative pb-0">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold tracking-tight">{group.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {group._count.members} member{group._count.members === 1 ? "" : "s"}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="h-8 w-full shrink-0 sm:w-auto">
                  <Link href={`/admin/groups/${group.id}`}>Manage members</Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className={cn("relative flex flex-1 flex-col pt-4", isCompact ? "gap-3" : "gap-4")}>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Rename group</h4>
                <form action={renameGroup} className={formGap}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <div className="form-control flex-1">
                    <label htmlFor={`name-${group.id}`} className="label">
                      <span className="label-text font-semibold">Group name</span>
                    </label>
                    <Input id={`name-${group.id}`} name="name" defaultValue={group.name} required />
                  </div>
                  <Button type="submit" size="sm" className="w-full sm:w-auto">
                    Save name
                  </Button>
                </form>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Import members</h4>
                <ImportMembersForm groupId={group.id} action={importMembers} compact={isCompact} />
              </div>

              <form action={deleteGroup} className="mt-auto flex justify-end">
                <input type="hidden" name="groupId" value={group.id} />
                <Button type="submit" colorScheme="red" size="sm" className="w-full sm:w-auto">
                  Delete group
                </Button>
              </form>
            </CardContent>
          </Card>
          ))}
        </div>
      )}
    </div>
  );
}
