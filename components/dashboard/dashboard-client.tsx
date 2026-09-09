"use client";

import * as React from "react";
import { List, LayoutGrid, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { getCurrentQuarter } from "@/lib/quarters";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { QuarterSelector } from "@/components/dashboard/quarter-selector";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { EscalationsPanel } from "@/components/dashboard/escalations-panel";
import { TaskListView } from "@/components/dashboard/task-list-view";
import { TaskKanbanView } from "@/components/dashboard/task-kanban-view";
import { NewTaskDialog } from "@/components/dashboard/new-task-dialog";
import {
  TaskFilters,
  applyTaskFilters,
  EMPTY_TASK_FILTERS,
  type TaskFilterState,
} from "@/components/dashboard/task-filters";
import type { PublicUser, TaskListItem } from "@/types";
import { TASK_PRIORITIES, type TaskStatus } from "@/lib/enums";

const PRIORITY_RANK = Object.fromEntries(TASK_PRIORITIES.map((p, i) => [p, i]));

type ViewMode = "list" | "kanban";

export function DashboardClient() {
  const { user } = useAuth();
  const [quarter, setQuarter] = React.useState(getCurrentQuarter());
  const [view, setView] = React.useState<ViewMode>("kanban");
  const [tasks, setTasks] = React.useState<TaskListItem[]>([]);
  const [users, setUsers] = React.useState<PublicUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<TaskFilterState>(EMPTY_TASK_FILTERS);

  const loadTasks = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ tasks: TaskListItem[] }>(
        `/api/tasks?quarter=${encodeURIComponent(quarter)}`
      );
      setTasks(data.tasks);
    } finally {
      setLoading(false);
    }
  }, [quarter]);

  React.useEffect(() => {
    loadTasks();
    setFilters(EMPTY_TASK_FILTERS);
  }, [loadTasks]);

  const filteredTasks = React.useMemo(() => {
    const filtered = applyTaskFilters(tasks, filters);
    // Sort by priority (Critical -> Low); Array.prototype.sort is stable, so
    // tasks of equal priority keep the API's original order (newest first).
    return [...filtered].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  }, [tasks, filters]);

  React.useEffect(() => {
    if (user && user.role !== "viewer") {
      api
        .get<{ users: PublicUser[] }>("/api/users")
        .then((data) => setUsers(data.users.filter((u) => u.isActive)))
        .catch(() => setUsers([]));
    }
  }, [user]);

  async function handleResolve(taskId: string, escalationId: string) {
    await api.patch(`/api/tasks/${taskId}/escalate`, { escalationId });
    loadTasks();
  }

  async function handleDelete(taskId: string) {
    await api.del(`/api/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      await api.patch(`/api/tasks/${taskId}`, { status });
    } catch {
      setTasks(previous);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-faint">Tasks across the team, by quarter.</p>
        </div>
        <div className="flex items-center gap-3">
          <QuarterSelector quarter={quarter} onChange={setQuarter} />
          {user.role !== "viewer" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = "/api/export/tasks";
                }}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <NewTaskDialog
                quarter={quarter}
                users={users}
                onCreated={(task) => setTasks((prev) => [task, ...prev])}
              />
            </>
          )}
        </div>
      </div>

      <EscalationsPanel tasks={tasks} currentUser={user} onResolve={handleResolve} />

      <StatTiles tasks={tasks} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-faint">
            {quarter} tasks{" "}
            {loading
              ? "· loading..."
              : filteredTasks.length === tasks.length
                ? `(${tasks.length})`
                : `(${filteredTasks.length} of ${tasks.length})`}
          </h2>
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="kanban" className="flex items-center gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-1.5">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <TaskFilters tasks={tasks} users={users} value={filters} onChange={setFilters} />
      </div>

      {view === "kanban" ? (
        <TaskKanbanView
          tasks={filteredTasks}
          currentUser={user}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <TaskListView tasks={filteredTasks} currentUser={user} onDelete={handleDelete} />
      )}
    </div>
  );
}
