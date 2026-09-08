"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TaskOverview } from "@/components/tasks/task-overview";
import { OriginAndValue } from "@/components/tasks/origin-value";
import { TaskLinks } from "@/components/tasks/task-links";
import { TaskDocuments } from "@/components/tasks/task-documents";
import { TaskTodos } from "@/components/tasks/task-todos";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskTimeline } from "@/components/tasks/task-timeline";
import { EscalationSection } from "@/components/tasks/escalation-section";
import type { PublicUser, TaskDetail, TaskPermissions } from "@/types";

/**
 * The actual task-detail content, rendered by the standalone `/tasks/[id]`
 * page via `TaskDetailClient` below.
 *
 * `onChanged` is an optional hook fired after every successful mutation
 * (patch/delete/comment/etc.) so a parent list view can refresh itself; the
 * component always re-fetches and re-renders its own state regardless.
 */
export function TaskDetailContent({
  taskId,
  onDeleted,
  onChanged,
  backHref,
  backLabel = "Back to dashboard",
}: {
  taskId: string;
  onDeleted?: () => void;
  onChanged?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [task, setTask] = React.useState<TaskDetail | null>(null);
  const [permissions, setPermissions] = React.useState<TaskPermissions | null>(null);
  const [users, setUsers] = React.useState<PublicUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

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
    setLoading(true);
    setNotFound(false);
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
    onChanged?.();
  }

  async function handleDelete() {
    await api.del(`/api/tasks/${taskId}`);
    onChanged?.();
    if (onDeleted) {
      onDeleted();
    } else {
      router.replace("/");
    }
  }

  if (loading) return <div className="py-10 text-center text-sm text-text-faint">Loading...</div>;
  if (notFound || !task || !permissions || !user) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-sm text-text-faint">This task doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link href={backHref ?? "/"} className="text-sm text-brand-blue hover:underline">
          {backLabel}
        </Link>
      </div>
    );
  }

  const canEdit = permissions.canEdit;
  const canComment = true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {backHref !== undefined ? (
          backHref ? (
            <Link href={backHref} className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text-primary">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          ) : (
            <span />
          )
        ) : (
          <Link href="/" className="flex items-center gap-1.5 text-sm text-text-faint hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        )}
        {permissions.canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="text-critical hover:bg-critical/10"
            onClick={() => setDeleteConfirmOpen(true)}
          >
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
          onChanged?.();
          load();
        }}
        onResolve={async () => {
          const data = await api.patch<{ task: TaskDetail }>(`/api/tasks/${taskId}/escalate`, {
            action: "resolve",
          });
          setTask((prev) => (prev ? { ...prev, ...data.task } : prev));
          onChanged?.();
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
            onChanged?.();
            load();
          }}
          onDeleteLink={async (linkId) => {
            await api.del(`/api/tasks/${taskId}/links`, { linkId });
            onChanged?.();
            load();
          }}
        />
        <TaskDocuments
          documents={task.documents}
          canEdit={canEdit}
          onAdd={async (title, url) => {
            await api.post(`/api/tasks/${taskId}/documents`, { title, url });
            onChanged?.();
            load();
          }}
          onDelete={async (documentId) => {
            await api.del(`/api/tasks/${taskId}/documents`, { documentId });
            onChanged?.();
            load();
          }}
        />
        <TaskTodos
          todos={task.todos}
          canEdit={canEdit}
          onAdd={async (text) => {
            await api.post(`/api/tasks/${taskId}/todos`, { text });
            onChanged?.();
            load();
          }}
          onToggle={async (todoId, isDone) => {
            await api.patch(`/api/tasks/${taskId}/todos`, { todoId, isDone });
            onChanged?.();
            load();
          }}
          onDelete={async (todoId) => {
            await api.del(`/api/tasks/${taskId}/todos`, { todoId });
            onChanged?.();
            load();
          }}
        />
      </div>

      {canComment && (
        <TaskComments
          comments={task.comments}
          onAdd={async (text) => {
            await api.post(`/api/tasks/${taskId}/comments`, { text });
            onChanged?.();
            load();
          }}
        />
      )}

      <TaskTimeline events={task.events} />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this task?"
        description={`"${task.title}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete task"
        onConfirm={handleDelete}
      />
    </div>
  );
}

/** Thin wrapper used by the standalone `/tasks/[id]` page — keeps that route's
 * invocation unchanged while the actual content lives in `TaskDetailContent`. */
export function TaskDetailClient({ taskId }: { taskId: string }) {
  return <TaskDetailContent taskId={taskId} />;
}
