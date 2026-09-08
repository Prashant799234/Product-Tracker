import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, tasks, taskTodos } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canEditTask } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const createSchema = z.object({ text: z.string().min(1) });
const toggleSchema = z.object({ todoId: z.string().uuid(), isDone: z.boolean() });
const deleteSchema = z.object({ todoId: z.string().uuid() });

async function loadTaskOrRespond(taskId: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return task ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await loadTaskOrRespond(params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditTask(user, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Todo text is required" }, { status: 400 });
  }

  const [todo] = await db
    .insert(taskTodos)
    .values({ taskId: params.id, text: parsed.data.text, createdBy: user.id })
    .returning();

  await logTaskEvent(db, {
    taskId: params.id,
    actorId: user.id,
    eventType: "todo_added",
    detail: { text: todo.text },
  });

  return NextResponse.json({ todo }, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await loadTaskOrRespond(params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditTask(user, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [updated] = await db
    .update(taskTodos)
    .set({
      isDone: parsed.data.isDone,
      completedAt: parsed.data.isDone ? new Date() : null,
    })
    .where(and(eq(taskTodos.id, parsed.data.todoId), eq(taskTodos.taskId, params.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.isDone) {
    await logTaskEvent(db, {
      taskId: params.id,
      actorId: user.id,
      eventType: "todo_completed",
      detail: { text: updated.text },
    });
  }

  return NextResponse.json({ todo: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await loadTaskOrRespond(params.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditTask(user, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await db
    .delete(taskTodos)
    .where(and(eq(taskTodos.id, parsed.data.todoId), eq(taskTodos.taskId, params.id)));

  return NextResponse.json({ ok: true });
}
