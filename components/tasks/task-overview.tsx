"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge, ALL_STATUSES } from "@/components/tasks/status-badge";
import { formatQuarterDisplay } from "@/lib/quarters";
import { TASK_PRIORITIES, type TaskPriority, type TaskStatus } from "@/lib/enums";
import type { PublicUser, TaskDetail } from "@/types";

export function TaskOverview({
  task,
  users,
  canEdit,
  onPatch,
}: {
  task: TaskDetail;
  users: PublicUser[];
  canEdit: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description ?? "");
  const [module, setModule] = React.useState(task.module);
  const [progress, setProgress] = React.useState(task.progressPct);

  React.useEffect(() => setTitle(task.title), [task.title]);
  React.useEffect(() => setDescription(task.description ?? ""), [task.description]);
  React.useEffect(() => setModule(task.module), [task.module]);
  React.useEffect(() => setProgress(task.progressPct), [task.progressPct]);

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{task.title}</h1>
          {task.description && <p className="mt-1 text-sm text-text-faint">{task.description}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Module" value={task.module} />
          <Field label="Priority" value={<PriorityBadge priority={task.priority} />} />
          <Field label="Status" value={<StatusBadge status={task.status} />} />
          <Field label="Quarter" value={formatQuarterDisplay(task.quarter)} />
          <Field label="Assignee" value={task.assignee?.name ?? "Unassigned"} />
          <Field label="Due date" value={task.dueDate ?? "—"} />
        </dl>
        <div>
          <Label>Progress</Label>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-brand-orange"
              style={{ width: `${task.progressPct}%` }}
            />
          </div>
          <span className="mt-1 block text-xs text-text-dim">{task.progressPct}%</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== task.title && onPatch({ title })}
          className="text-lg font-semibold"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (task.description ?? "") && onPatch({ description })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="module">Module</Label>
          <Input
            id="module"
            value={module}
            onChange={(e) => setModule(e.target.value)}
            onBlur={() => module !== task.module && onPatch({ module })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Priority</Label>
          <Select value={task.priority} onValueChange={(v) => onPatch({ priority: v as TaskPriority })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={task.status} onValueChange={(v) => onPatch({ status: v as TaskStatus })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Assignee</Label>
          <Select
            value={task.assignedTo ?? "unassigned"}
            onValueChange={(v) => onPatch({ assignedTo: v === "unassigned" ? null : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quarter">Quarter</Label>
          <Input
            id="quarter"
            defaultValue={task.quarter}
            placeholder="2026-Q3"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (/^\d{4}-Q[1-4]$/.test(v) && v !== task.quarter) onPatch({ quarter: v });
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            type="date"
            defaultValue={task.dueDate ?? ""}
            onChange={(e) => onPatch({ dueDate: e.target.value || null })}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Progress</Label>
          <span className="text-xs text-text-dim">{progress}%</span>
        </div>
        <Slider
          className="mt-2"
          value={[progress]}
          max={100}
          step={5}
          onValueChange={([v]) => setProgress(v)}
          onValueCommit={([v]) => onPatch({ progressPct: v })}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-text-dim">{label}</dt>
      <dd className="text-sm text-text-secondary">{value}</dd>
    </div>
  );
}
