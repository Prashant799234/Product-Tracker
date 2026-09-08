"use client";

import * as React from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { ALL_STATUSES } from "@/components/tasks/status-badge";
import { canDeleteTask } from "@/lib/task-rules";
import { cn } from "@/lib/utils";
import type { PublicUser, TaskListItem } from "@/types";
import type { TaskStatus } from "@/lib/enums";

export function TaskKanbanView({
  tasks,
  currentUser,
  onDelete,
  onOpenTask,
  onStatusChange,
}: {
  tasks: TaskListItem[];
  currentUser: PublicUser;
  onDelete: (taskId: string) => void;
  onOpenTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      onStatusChange(taskId, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ALL_STATUSES.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <KanbanColumn key={status} status={status} count={columnTasks.length}>
              {columnTasks.map((task) => {
                const deletable = canDeleteTask(currentUser, task);
                return (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    deletable={deletable}
                    onOpenTask={onOpenTask}
                    onDelete={onDelete}
                  />
                );
              })}
              {columnTasks.length === 0 && (
                <p className="px-1 py-2 text-center text-xs text-text-dim">No tasks</p>
              )}
            </KanbanColumn>
          );
        })}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  count,
  children,
}: {
  status: TaskStatus;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-faint">{status}</h3>
        <span className="text-xs text-text-dim">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 rounded-lg bg-surface-1/50 p-2 min-h-[6rem] transition-colors",
          isOver && "bg-brand-orange/10 ring-1 ring-inset ring-brand-orange/40"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  deletable,
  onOpenTask,
  onDelete,
}: {
  task: TaskListItem;
  deletable: boolean;
  onOpenTask: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : {};

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        className={cn(
          "cursor-pointer touch-none transition-colors hover:bg-surface-2",
          isDragging && "opacity-50 shadow-lg"
        )}
        onClick={() => onOpenTask(task.id)}
      >
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
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Delete "${task.title}" permanently? This cannot be undone.`)) {
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
            <PriorityBadge priority={task.priority} />
            {task.assignees.length > 0 ? (
              <div className="flex -space-x-1.5">
                {task.assignees.map((assignee) => (
                  <Avatar key={assignee.id} className="h-6 w-6 ring-2 ring-surface-1">
                    <AvatarFallback className="text-[10px]">{assignee.initials}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <span className="text-xs text-text-dim">Unassigned</span>
            )}
          </div>
          <Progress value={task.progressPct} />
        </CardContent>
      </Card>
    </div>
  );
}
