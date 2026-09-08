"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { TaskOverview } from "@/components/tasks/task-overview";
import { OriginAndValue } from "@/components/tasks/origin-value";
import { TaskLinks } from "@/components/tasks/task-links";
import { TaskDocuments } from "@/components/tasks/task-documents";
import { TaskTodos } from "@/components/tasks/task-todos";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskTimeline } from "@/components/tasks/task-timeline";
import { EscalationSection } from "@/components/tasks/escalation-section";
import type { PublicUser, TaskDetail, TaskPermissions } from "@/types";

export function TaskDetailClient({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [task, setTask] = React.useState<TaskDetail | null>(null);
  const [permissions, setPermissions] = React.useState<TaskPermissions | null>(null);
  const [users, setUsers] = React.useState<PublicUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const data = await api.get<{ task: TaskDetail; permissions: TaskPermissions }>(
        `/api/tasks/${taskId}`
      );
      setTask(data.task);
      setPermissions(data.permissions);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (user && user.role !== "viewer") {
      api
        .get<{ users: PublicUser[] }>("/api/users")
        .then((data) => setUsers(data.users.filter((u) => u.isActive)))
        .catch(() => setUsers([]));
    }
  }, [user]);

  async function handlePatch(patch: Record<string, unknown>) {
    const data = await api.patch<{ task: TaskDetail }>(`/api/tasks/${taskId}`, patch);
    setTask(data.task);
  }

  async function handleDelete() {
    if (!confirm("Delete this task permanently? This cannot be undone.")) return;
    await api.del(`/api/tasks/${taskId}`);
    router.replace("/");
  }

  if (loading) return <div className="py-10 text-center text-sm text-text-faint">Loading...</div>;
  if (notFound || !task || !permissions || !user) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-sm text-text-faint">This task doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link href="/" className="text-sm text-brand-blue hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const canEdit = permissions.canEdit;
  const canComment = true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        {permissions.canDelete && (
          <Button variant="ghost" size="sm" className="text-critical hover:bg-critical/10" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Delete task
          </Button>
        )}
      </div>

      <EscalationSection
        task={task}
        canRaise={canEdit}
        canResolve={user.role === "admin" || task.escalatedBy === user.id}
        onRaise={async (note) => {
          const data = await api.patch<{ task: TaskDetail }>(`/api/tasks/${taskId}/escalate`, {
            action: "raise",
            note,
          });
          setTask((prev) => (prev ? { ...prev, ...data.task } : prev));
          load();
        }}
        onResolve={async () => {
          const data = await api.patch<{ task: TaskDetail }>(`/api/tasks/${taskId}/escalate`, {
            action: "resolve",
          });
          setTask((prev) => (prev ? { ...prev, ...data.task } : prev));
          load();
        }}
      />

      <div className="rounded-lg border border-text-muted/10 bg-surface-1 p-5">
        <TaskOverview task={task} users={users} canEdit={canEdit} onPatch={handlePatch} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OriginAndValue task={task} canEdit={canEdit} onPatch={handlePatch} />
        <TaskLinks
          task={task}
          canEdit={canEdit}
          onPatch={handlePatch}
          onAddLink={async (label, url) => {
            await api.post(`/api/tasks/${taskId}/links`, { label, url });
            load();
          }}
          onDeleteLink={async (linkId) => {
            await api.del(`/api/tasks/${taskId}/links`, { linkId });
            load();
          }}
        />
        <TaskDocuments
          documents={task.documents}
          canEdit={canEdit}
          onAdd={async (title, url) => {
            await api.post(`/api/tasks/${taskId}/documents`, { title, url });
            load();
          }}
          onDelete={async (documentId) => {
            await api.del(`/api/tasks/${taskId}/documents`, { documentId });
            load();
          }}
        />
        <TaskTodos
          todos={task.todos}
          canEdit={canEdit}
          onAdd={async (text) => {
            await api.post(`/api/tasks/${taskId}/todos`, { text });
            load();
          }}
          onToggle={async (todoId, isDone) => {
            await api.patch(`/api/tasks/${taskId}/todos`, { todoId, isDone });
            load();
          }}
          onDelete={async (todoId) => {
            await api.del(`/api/tasks/${taskId}/todos`, { todoId });
            load();
          }}
        />
      </div>

      {canComment && (
        <TaskComments
          comments={task.comments}
          onAdd={async (text) => {
            await api.post(`/api/tasks/${taskId}/comments`, { text });
            load();
          }}
        />
      )}

      <TaskTimeline events={task.events} />
    </div>
  );
}
