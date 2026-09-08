import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tasks } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canRaiseEscalation, canResolveEscalation } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("raise"), note: z.string().min(1) }),
  z.object({ action: z.literal("resolve") }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [task] = await db.select().from(tasks).where(eq(tasks.id, params.id)).limit(1);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.action === "raise") {
    if (!canRaiseEscalation(user, task)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const [updated] = await db
      .update(tasks)
      .set({
        isEscalated: true,
        escalationNote: parsed.data.note,
        escalatedBy: user.id,
        escalatedAt: new Date(),
        escalationResolved: false,
        escalationResolvedBy: null,
        escalationResolvedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, params.id))
      .returning();

    await logTaskEvent(db, {
      taskId: params.id,
      actorId: user.id,
      eventType: "escalated",
      detail: { note: parsed.data.note },
    });

    return NextResponse.json({ task: updated });
  }

  // action === "resolve"
  if (!task.isEscalated || task.escalationResolved) {
    return NextResponse.json({ error: "This task has no open escalation" }, { status: 400 });
  }
  if (!canResolveEscalation(user, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [updated] = await db
    .update(tasks)
    .set({
      escalationResolved: true,
      escalationResolvedBy: user.id,
      escalationResolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, params.id))
    .returning();

  await logTaskEvent(db, {
    taskId: params.id,
    actorId: user.id,
    eventType: "escalation_resolved",
    detail: {},
  });

  return NextResponse.json({ task: updated });
}
