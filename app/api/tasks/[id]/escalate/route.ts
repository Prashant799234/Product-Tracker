import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tasks, taskEscalations, users } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { canRaiseEscalation, canResolveEscalation } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/events";
import { sanitizeEscalation } from "@/lib/escalations";

export const dynamic = "force-dynamic";

const raiseSchema = z.object({
  note: z.string().min(1),
  taggedUserId: z.string().uuid().optional(),
});

const resolveSchema = z.object({
  escalationId: z.string().uuid(),
});

/** Raise a new escalation on a task. A task may have any number of open or
 * resolved escalations over its lifetime. */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [task] = await db.select().from(tasks).where(eq(tasks.id, params.id)).limit(1);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = raiseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!canRaiseEscalation(user, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If a taggedUserId is provided but doesn't resolve to a real user, just
  // omit the tag rather than erroring.
  let taggedUser = null as typeof users.$inferSelect | null;
  if (parsed.data.taggedUserId) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, parsed.data.taggedUserId))
      .limit(1);
    taggedUser = row ?? null;
  }

  const [created] = await db
    .insert(taskEscalations)
    .values({
      taskId: params.id,
      raisedBy: user.id,
      note: parsed.data.note,
      taggedUserId: taggedUser?.id ?? null,
    })
    .returning();

  await logTaskEvent(db, {
    taskId: params.id,
    actorId: user.id,
    eventType: "escalated",
    detail: {
      note: parsed.data.note,
      taggedUserId: taggedUser?.id ?? null,
      taggedUserName: taggedUser?.name ?? null,
    },
  });

  const full = await db.query.taskEscalations.findFirst({
    where: eq(taskEscalations.id, created.id),
    with: { raiser: true, taggedUser: true, resolver: true },
  });

  return NextResponse.json({ escalation: sanitizeEscalation(full!) }, { status: 201 });
}

/** Resolve one specific escalation, identified by `escalationId` in the
 * request body (a task can have several open escalations at once, so the
 * route id alone no longer identifies which one to resolve). */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = resolveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [escalation] = await db
    .select()
    .from(taskEscalations)
    .where(eq(taskEscalations.id, parsed.data.escalationId))
    .limit(1);

  if (!escalation || escalation.taskId !== params.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (escalation.resolved) {
    return NextResponse.json(
      { error: "This escalation is already resolved" },
      { status: 400 }
    );
  }

  if (!canResolveEscalation(user, escalation)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(taskEscalations)
    .set({ resolved: true, resolvedBy: user.id, resolvedAt: new Date() })
    .where(eq(taskEscalations.id, escalation.id));

  await logTaskEvent(db, {
    taskId: params.id,
    actorId: user.id,
    eventType: "escalation_resolved",
    detail: { escalationId: escalation.id },
  });

  const full = await db.query.taskEscalations.findFirst({
    where: eq(taskEscalations.id, escalation.id),
    with: { raiser: true, taggedUser: true, resolver: true },
  });

  return NextResponse.json({ escalation: sanitizeEscalation(full!) });
}
