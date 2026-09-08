"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TaskListItem } from "@/types";
import type { PublicUser } from "@/types";

export function EscalationsPanel({
  tasks,
  currentUser,
  onResolve,
}: {
  tasks: TaskListItem[];
  currentUser: PublicUser;
  onResolve: (taskId: string) => void;
}) {
  const escalated = tasks.filter((t) => t.isEscalated && !t.escalationResolved);
  if (escalated.length === 0) return null;

  return (
    <Card className="border-critical/40 bg-critical/5">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-critical">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Escalations ({escalated.length})
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          {escalated.map((task) => {
            const canResolve =
              currentUser.role === "admin" || task.escalatedBy === currentUser.id;
            return (
              <div
                key={task.id}
                className="flex flex-col gap-2 rounded-md border border-critical/20 bg-surface-1 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-sm font-medium text-text-primary hover:text-brand-orange hover:underline"
                  >
                    {task.title}
                  </Link>
                  <p className="text-xs text-text-faint">
                    Assigned to{" "}
                    {task.assignees.length > 0
                      ? task.assignees.map((a) => a.name).join(", ")
                      : "Unassigned"}{" "}
                    · raised by {task.escalator?.name ?? "Unknown"}
                    {task.escalationNote ? ` — "${task.escalationNote}"` : ""}
                  </p>
                </div>
                {canResolve && (
                  <Button size="sm" variant="destructive" onClick={() => onResolve(task.id)}>
                    Resolve
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
