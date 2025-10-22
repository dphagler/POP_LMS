"use client";

import { useState } from "react";

import { DataDensityToggle, type DataDensity } from "@/components/admin/data-density-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const isCompact = density === "compact";
  const formGap = isCompact ? "flex flex-col gap-2 sm:flex-row sm:items-end" : "flex flex-col gap-3 sm:flex-row sm:items-end";

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Groups you create will appear here.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DataDensityToggle density={density} onDensityChange={setDensity} />
      </div>
      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="flex flex-col gap-1 pb-0 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{group.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {group._count.members} member{group._count.members === 1 ? "" : "s"}
                </p>
              </div>
            </CardHeader>

            <CardContent className={cn("pt-4", isCompact ? "space-y-3" : "space-y-4")}>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Rename group</h4>
                <form action={renameGroup} className={formGap}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`name-${group.id}`}>Group name</Label>
                    <Input id={`name-${group.id}`} name="name" defaultValue={group.name} required />
                  </div>
                  <Button type="submit" className="w-full sm:w-auto">
                    Save name
                  </Button>
                </form>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Import members</h4>
                <ImportMembersForm groupId={group.id} action={importMembers} compact={isCompact} />
              </div>

              <form action={deleteGroup} className="flex justify-end">
                <input type="hidden" name="groupId" value={group.id} />
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                >
                  Delete group
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
