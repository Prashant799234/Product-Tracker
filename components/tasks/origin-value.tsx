"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IMPACT_AREAS } from "@/lib/enums";
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
  const impactAreas = task.impactAreas ?? [];

  React.useEffect(() => setSource(task.source ?? ""), [task.source]);
  React.useEffect(() => setValueAdd(task.valueAdd ?? ""), [task.valueAdd]);

  function toggleImpactArea(area: string) {
    const next = impactAreas.includes(area)
      ? impactAreas.filter((a) => a !== area)
      : [...impactAreas, area];
    onPatch({ impactAreas: next });
  }

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
        <div className="flex flex-col gap-1.5">
          <Label>Impact areas</Label>
          {canEdit ? (
            <div className="flex flex-wrap gap-1.5">
              {IMPACT_AREAS.map((area) => {
                const active = impactAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleImpactArea(area)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                      active
                        ? "border-transparent bg-brand-orange/15 text-brand-orange-tint"
                        : "border-text-muted/20 text-text-faint hover:bg-surface-2"
                    )}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          ) : impactAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {impactAreas.map((area) => (
                <Badge key={area} variant="orange">
                  {area}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-faint">—</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
