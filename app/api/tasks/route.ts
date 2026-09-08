import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db, tasks, TASK_SEVERITIES, TASK_STATUSES } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getVisibilityScope } from "@/lib/permissions";
import { logTaskEvent } from "@/lib/events";
import { getCurrentQuarter } from "@/lib/quarters";

export const dynamic = "force-dynamic";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/),
  module: z.string().min(1),
  severity: z.enum(TASK_SEVERITIES).default("Medium"),
  status: z.enum(TASK_STATUSES).default("To Do"),
  progressPct: z.number().int().min(0).max(100).default(0),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  valueAdd: z.string().optional().nullable(),
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
      assignee: true,
      creator: true,
      escalator: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return NextResponse.json({ tasks: rows });
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
      severity: data.severity,
      status: data.status,
      progressPct: data.progressPct,
      assignedTo: data.assignedTo || null,
      createdBy: user.id,
      dueDate: data.dueDate || null,
      source: data.source || null,
      valueAdd: data.valueAdd || null,
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

  return NextResponse.json({ task: created }, { status: 201 });
}
