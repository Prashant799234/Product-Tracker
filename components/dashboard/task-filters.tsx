"use client";

import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function MultiSelectDropdown<T extends string>({
  label,
  options,
  optionLabel,
  selected,
  onChange,
}: {
  label: string;
  options: T[];
  optionLabel: (option: T) => string;
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  function toggle(option: T) {
    onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {label}
          {selected.length > 0 && ` (${selected.length})`}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.includes(option)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => toggle(option)}
          >
            {optionLabel(option)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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

  const hasActiveFilters =
    value.modules.length > 0 ||
    value.priorities.length > 0 ||
    value.assigneeIds.length > 0 ||
    value.escalatedOnly;

  if (modules.length === 0 && users.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {modules.length > 0 && (
        <MultiSelectDropdown
          label="Module"
          options={modules}
          optionLabel={(m) => m}
          selected={value.modules}
          onChange={(modules) => onChange({ ...value, modules })}
        />
      )}

      <MultiSelectDropdown
        label="Priority"
        options={[...TASK_PRIORITIES]}
        optionLabel={(p) => p}
        selected={value.priorities}
        onChange={(priorities) => onChange({ ...value, priorities })}
      />

      {users.length > 0 && (
        <MultiSelectDropdown
          label="Assignee"
          options={users.map((u) => u.id)}
          optionLabel={(id) => users.find((u) => u.id === id)?.name ?? id}
          selected={value.assigneeIds}
          onChange={(assigneeIds) => onChange({ ...value, assigneeIds })}
        />
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
  );
}
