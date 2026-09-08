import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tasks, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canDeleteTask, canEditTask, canViewTask } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  quarter: z
    .string()
    .regex(/^\d{4}-Q[1-4]$/)
    .optional(),
  module: z.string().min(1).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  progressPct: z.number().int().min(0).max(100).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  valueAdd: z.string().nullable().optional(),
  impactAreas: z.array(z.string()).optional(),
  jiraUrl: z.string().nullable().optional(),
  confluenceUrl: z.string().nullable().optional(),
  figmaUrl: z.string().nullable().optional(),
  dependencyId: z.string().uuid().nullable().optional(),
});

async function loadTaskDetail(taskId: string) {
  return db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      assignee: true,
      creator: true,
      escalator: true,
      links: { orderBy: (l, { desc }) => [desc(l.createdAt)] },
      documents: { orderBy: (d, { desc }) => [desc(d.createdAt)] },
      todos: { orderBy: (t, { asc }) => [asc(t.createdAt)] },
      comments: {
        orderBy: (c, { asc }) => [asc(c.createdAt)],
        with: { author: true },
      },
      events: {
        orderBy: (e, { asc }) => [asc(e.createdAt)],
        with: { actor: true },
      },
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await loadTaskDetail(params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await canViewTask(user, task))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    task,
    permissions: {
      canEdit: canEditTask(user, task),
      canDelete: canDeleteTask(user, task),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [existing] = await db.select().from(tasks).where(eq(tasks.id, params.id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEditTask(user, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const updates: Partial<typeof tasks.$inferInsert> = { updatedAt: new Date() };
  const events: { eventType: any; detail: unknown }[] = [];

  if (data.status !== undefined && data.status !== existing.status) {
    updates.status = data.status;
    events.push({
      eventType: "status_changed",
      detail: { from: existing.status, to: data.status },
    });
  }
  if (data.progressPct !== undefined && data.progressPct !== existing.progressPct) {
    updates.progressPct = data.progressPct;
    events.push({
      eventType: "progress_changed",
      detail: { from: existing.progressPct, to: data.progressPct },
    });
  }
  if (data.assignedTo !== undefined && data.assignedTo !== existing.assignedTo) {
    updates.assignedTo = data.assignedTo;
    events.push({
      eventType: "assigned_changed",
      detail: { from: existing.assignedTo, to: data.assignedTo },
    });
  }
  if (data.priority !== undefined && data.priority !== existing.priority) {
    updates.priority = data.priority;
    events.push({
      eventType: "priority_changed",
      detail: { from: existing.priority, to: data.priority },
    });
  }
  if (data.quarter !== undefined && data.quarter !== existing.quarter) {
    updates.quarter = data.quarter;
    events.push({
      eventType: "quarter_changed",
      detail: { from: existing.quarter, to: data.quarter },
    });
  }

  const genericFields: (keyof typeof data)[] = [
    "title",
    "description",
    "module",
    "dueDate",
    "source",
    "valueAdd",
    "impactAreas",
    "jiraUrl",
    "confluenceUrl",
    "figmaUrl",
    "dependencyId",
  ];
  const changedGeneric: string[] = [];
  for (const field of genericFields) {
    if (data[field] !== undefined && data[field] !== (existing as any)[field]) {
      (updates as any)[field] = data[field] || null;
      changedGeneric.push(field);
    }
  }
  if (changedGeneric.length > 0) {
    events.push({ eventType: "edited", detail: { fields: changedGeneric } });
  }

  if (Object.keys(updates).length === 1) {
    // Only updatedAt would change — nothing actually changed.
    return NextResponse.json({ task: existing });
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, params.id))
    .returning();

  for (const e of events) {
    await logTaskEvent(db, {
      taskId: params.id,
      actorId: user.id,
      eventType: e.eventType,
      detail: e.detail,
    });
  }

  const full = await loadTaskDetail(params.id);
  return NextResponse.json({ task: full ?? updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [existing] = await db.select().from(tasks).where(eq(tasks.id, params.id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canDeleteTask(user, existing)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(tasks).where(eq(tasks.id, params.id));
  return NextResponse.json({ ok: true });
}
