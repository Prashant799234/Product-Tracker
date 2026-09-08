"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SeverityBadge } from "@/components/tasks/severity-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { cn } from "@/lib/utils";
import { isOverdue } from "@/lib/quarters";
import { canDeleteTask } from "@/lib/task-rules";
import type { PublicUser, TaskListItem } from "@/types";

export function TaskListView({
  tasks,
  currentUser,
  onDelete,
}: {
  tasks: TaskListItem[];
  currentUser: PublicUser;
  onDelete: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-text-muted/20 p-10 text-center text-sm text-text-faint">
        No tasks in this quarter yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-text-muted/10">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-text-muted/10 bg-surface-1 text-xs uppercase tracking-wide text-text-dim">
            <th className="px-4 py-3 font-medium">Task</th>
            <th className="px-4 py-3 font-medium">Module</th>
            <th className="px-4 py-3 font-medium">Severity</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">Assignee</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.status);
            const deletable = canDeleteTask(currentUser, task);
            return (
              <tr
                key={task.id}
                className="border-b border-text-muted/5 bg-surface-1 transition-colors last:border-0 hover:bg-surface-2"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="font-medium text-text-primary hover:text-brand-orange hover:underline"
                  >
                    {task.title}
                  </Link>
                  {task.isEscalated && !task.escalationResolved && (
                    <span className="ml-2 rounded-full bg-critical/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-critical">
                      Escalated
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-faint">{task.module}</td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={task.severity} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Progress value={task.progressPct} className="w-20" />
                    <span className="text-xs text-text-dim">{task.progressPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {task.assignee.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-text-faint">{task.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-text-dim">Unassigned</span>
                  )}
                </td>
                <td className={cn("px-4 py-3", overdue ? "font-medium text-critical" : "text-text-faint")}>
                  {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {deletable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-critical hover:bg-critical/10"
                      onClick={() => {
                        if (confirm(`Delete "${task.title}" permanently? This cannot be undone.`)) {
                          onDelete(task.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
