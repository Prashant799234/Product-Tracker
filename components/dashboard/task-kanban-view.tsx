"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SeverityBadge } from "@/components/tasks/severity-badge";
import { ALL_STATUSES } from "@/components/tasks/status-badge";
import { canDeleteTask } from "@/lib/task-rules";
import type { PublicUser, TaskListItem } from "@/types";

export function TaskKanbanView({
  tasks,
  currentUser,
  onDelete,
}: {
  tasks: TaskListItem[];
  currentUser: PublicUser;
  onDelete: (taskId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {ALL_STATUSES.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-faint">
                {status}
              </h3>
              <span className="text-xs text-text-dim">{columnTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2 rounded-lg bg-surface-1/50 p-2 min-h-[6rem]">
              {columnTasks.map((task) => {
                const deletable = canDeleteTask(currentUser, task);
                return (
                  <Link key={task.id} href={`/tasks/${task.id}`}>
                    <Card className="transition-colors hover:bg-surface-2">
                      <CardContent className="flex flex-col gap-2 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-text-primary">{task.title}</span>
                          <div className="flex shrink-0 items-center gap-1">
                            {task.isEscalated && !task.escalationResolved && (
                              <span className="h-2 w-2 rounded-full bg-critical" title="Escalated" />
                            )}
                            {deletable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-text-dim hover:bg-critical/10 hover:text-critical"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (
                                    confirm(`Delete "${task.title}" permanently? This cannot be undone.`)
                                  ) {
                                    onDelete(task.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <SeverityBadge severity={task.severity} />
                          {task.assignee && (
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {task.assignee.initials}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <Progress value={task.progressPct} />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
              {columnTasks.length === 0 && (
                <p className="px-1 py-2 text-center text-xs text-text-dim">No tasks</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
