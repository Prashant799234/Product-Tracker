"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { TASK_PRIORITIES, type TaskPriority } from "@/lib/enums";
import type { PublicUser, TaskListItem } from "@/types";

export type TaskFilterState = {
  modules: string[];
  priorities: TaskPriority[];
  assigneeIds: string[];
  escalatedOnly: boolean;
};

export const EMPTY_TASK_FILTERS: TaskFilterState = {
  modules: [],
  priorities: [],
  assigneeIds: [],
  escalatedOnly: false,
};

export function applyTaskFilters(tasks: TaskListItem[], filters: TaskFilterState): TaskListItem[] {
  return tasks.filter((task) => {
    if (filters.modules.length > 0 && !filters.modules.includes(task.module)) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
    if (
      filters.assigneeIds.length > 0 &&
      !task.assignees.some((a) => filters.assigneeIds.includes(a.id))
    ) {
      return false;
    }
    if (filters.escalatedOnly && !(task.isEscalated && !task.escalationResolved)) return false;
    return true;
  });
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-brand-orange/15 text-brand-orange-tint"
          : "border-text-muted/20 text-text-faint hover:bg-surface-2"
      )}
    >
      {children}
    </button>
  );
}

export function TaskFilters({
  tasks,
  users,
  value,
  onChange,
}: {
  tasks: TaskListItem[];
  users: PublicUser[];
  value: TaskFilterState;
  onChange: (next: TaskFilterState) => void;
}) {
  const modules = React.useMemo(
    () => Array.from(new Set(tasks.map((t) => t.module))).sort(),
    [tasks]
  );

  function toggle<K extends "modules" | "priorities" | "assigneeIds">(
    key: K,
    item: TaskFilterState[K][number]
  ) {
    const current = value[key] as unknown[];
    const next = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    onChange({ ...value, [key]: next });
  }

  const hasActiveFilters =
    value.modules.length > 0 ||
    value.priorities.length > 0 ||
    value.assigneeIds.length > 0 ||
    value.escalatedOnly;

  if (modules.length === 0 && users.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-text-muted/10 bg-surface-1 p-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        {modules.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-dim">Module</span>
            {modules.map((m) => (
              <Chip key={m} active={value.modules.includes(m)} onClick={() => toggle("modules", m)}>
                {m}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-text-dim">Priority</span>
          {TASK_PRIORITIES.map((p) => (
            <Chip key={p} active={value.priorities.includes(p)} onClick={() => toggle("priorities", p)}>
              {p}
            </Chip>
          ))}
        </div>

        {users.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-dim">Assignee</span>
            {users.map((u) => (
              <Chip
                key={u.id}
                active={value.assigneeIds.includes(u.id)}
                onClick={() => toggle("assigneeIds", u.id)}
              >
                {u.name}
              </Chip>
            ))}
          </div>
        )}

        <label className="flex items-center gap-1.5 text-xs text-text-faint">
          <Checkbox
            checked={value.escalatedOnly}
            onCheckedChange={(checked) => onChange({ ...value, escalatedOnly: checked === true })}
          />
          Escalated only
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_TASK_FILTERS)}
            className="flex items-center gap-1 text-xs text-brand-blue hover:underline"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
