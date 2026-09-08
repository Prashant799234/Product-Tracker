"use client";

import { AuthProvider } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { TaskDetailClient } from "@/components/tasks/task-detail-client";

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  return (
    <AuthProvider>
      <AppShell>
        <TaskDetailClient taskId={params.id} />
      </AppShell>
    </AuthProvider>
  );
}
