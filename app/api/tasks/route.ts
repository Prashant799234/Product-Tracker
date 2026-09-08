import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db, tasks, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/db";
import { getSessionUser, toPublicUser } from "@/lib/auth";
import { getVisibilityScope, taskVisibleUnderScope } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/events";
import { getCurrentQuarter } from "@/lib/quarters";
import { resolveAssignees } from "@/lib/assignees";

export const dynamic = "force-dynamic";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  module: z.string().min(1),
  priority: z.enum(TASK_PRIORITIES).default("Medium"),
  status: z.enum(TASK_STATUSES).default("To Do"),
  progressPct: z.number().int().min(0).max(100).default(0),
  assigneeIds: z.array(z.string().uuid()).optional(),
  dueDate: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  valueAdd: z.string().optional().nullable(),
  impactAreas: z.array(z.string()).optional(),
  jiraUrl: z.string().url().optional().nullable().or(z.literal("")),
  confluenceUrl: z.string().url().optional().nullable().or(z.literal("")),
  figmaUrl: z.string().url().optional().nullable().or(z.literal("")),
  dependencyId: z.string().uuid().optional().nullable(),
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const quarter = searchParams.get("quarter") ?? getCurrentQuarter();

  const scope = await getVisibilityScope(user);
  if (scope.kind === "none") {
    return NextResponse.json({ tasks: [] });
  }

  const conditions = [eq(tasks.quarter, quarter)];
  if (scope.kind === "modules") {
    conditions.push(inArray(tasks.module, scope.modules));
  }

  const rows = await db.query.tasks.findMany({
    where: and(...conditions),
    with: {
      creator: true,
      escalator: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  // Drizzle's relational query returns the FULL user row for `creator`/
  // `escalator` (including passwordHash, tokenVersion) — never let that reach
  // the client. Reduce to the same safe subset used everywhere else.
  const sanitized = rows.map((r) => ({
    ...r,
    creator: r.creator ? toPublicUser(r.creator) : null,
    escalator: r.escalator ? toPublicUser(r.escalator) : null,
  }));

  // An unassigned task is private to its creator, regardless of role — the
  // module-scope filter above doesn't know about that, so apply it here too.
  const visible = sanitized.filter((t) => taskVisibleUnderScope(scope, t, user));

  const withAssignees = await resolveAssignees(visible);

  return NextResponse.json({ tasks: withAssignees });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot create tasks" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const [created] = await db
    .insert(tasks)
    .values({
      title: data.title,
      description: data.description || null,
      quarter: data.quarter,
      module: data.module,
      priority: data.priority,
      status: data.status,
      progressPct: data.progressPct,
      assigneeIds: data.assigneeIds ?? [],
      createdBy: user.id,
      dueDate: data.dueDate || null,
      source: data.source || null,
      valueAdd: data.valueAdd || null,
      impactAreas: data.impactAreas ?? [],
      jiraUrl: data.jiraUrl || null,
      confluenceUrl: data.confluenceUrl || null,
      figmaUrl: data.figmaUrl || null,
      dependencyId: data.dependencyId || null,
    })
    .returning();

  await logTaskEvent(db, {
    taskId: created.id,
    actorId: user.id,
    eventType: "created",
    detail: { title: created.title },
  });

  const [withAssignees] = await resolveAssignees([created]);

  return NextResponse.json({ task: withAssignees }, { status: 201 });
}
