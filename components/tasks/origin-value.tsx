"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TaskDetail } from "@/types";

export function OriginAndValue({
  task,
  canEdit,
  onPatch,
}: {
  task: TaskDetail;
  canEdit: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const [source, setSource] = React.useState(task.source ?? "");
  const [valueAdd, setValueAdd] = React.useState(task.valueAdd ?? "");

  React.useEffect(() => setSource(task.source ?? ""), [task.source]);
  React.useEffect(() => setValueAdd(task.valueAdd ?? ""), [task.valueAdd]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Origin &amp; Value</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Source</Label>
          {canEdit ? (
            <Textarea
              placeholder="Where did this requirement come from?"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onBlur={() => source !== (task.source ?? "") && onPatch({ source })}
            />
          ) : (
            <p className="text-sm text-text-faint">{task.source || "—"}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Value add</Label>
          {canEdit ? (
            <Textarea
              placeholder="What value will this add?"
              value={valueAdd}
              onChange={(e) => setValueAdd(e.target.value)}
              onBlur={() => valueAdd !== (task.valueAdd ?? "") && onPatch({ valueAdd })}
            />
          ) : (
            <p className="text-sm text-text-faint">{task.valueAdd || "—"}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
