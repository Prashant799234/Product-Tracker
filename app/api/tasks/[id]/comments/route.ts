import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tasks, taskComments } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canViewTask } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const schema = z.object({ text: z.string().min(1) });

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [task] = await db.select().from(tasks).where(eq(tasks.id, params.id)).limit(1);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Everyone who can view a task (member/admin always, viewer via shares)
  // can comment — ownership of the task is irrelevant here.
  if (!(await canViewTask(user, task))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }

  const [comment] = await db
    .insert(taskComments)
    .values({ taskId: params.id, authorId: user.id, text: parsed.data.text })
    .returning();

  await logTaskEvent(db, {
    taskId: params.id,
    actorId: user.id,
    eventType: "comment_added",
    detail: { commentId: comment.id },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
