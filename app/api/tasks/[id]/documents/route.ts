import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, tasks, taskDocuments } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canEditTask } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const createSchema = z.object({ title: z.string().min(1), url: z.string().url() });
const deleteSchema = z.object({ documentId: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [task] = await db.select().from(tasks).where(eq(tasks.id, params.id)).limit(1);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditTask(user, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Title and a valid URL are required" }, { status: 400 });
  }

  const [document] = await db
    .insert(taskDocuments)
    .values({ taskId: params.id, title: parsed.data.title, url: parsed.data.url, createdBy: user.id })
    .returning();

  await logTaskEvent(db, {
    taskId: params.id,
    actorId: user.id,
    eventType: "document_added",
    detail: { title: document.title },
  });

  return NextResponse.json({ document }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [task] = await db.select().from(tasks).where(eq(tasks.id, params.id)).limit(1);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditTask(user, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await db
    .delete(taskDocuments)
    .where(and(eq(taskDocuments.id, parsed.data.documentId), eq(taskDocuments.taskId, params.id)));

  return NextResponse.json({ ok: true });
}
