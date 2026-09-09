import { NextResponse } from "next/server";
import { Workbook, type Column } from "exceljs";
import { format } from "date-fns";
import { db, tasks } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getVisibilityScope, taskVisibleUnderScope } from "@/lib/permissions";
import { resolveAssignees } from "@/lib/assignees";
import { sanitizeEscalation } from "@/lib/escalations";
import type { TaskListItem } from "@/types";

export const dynamic = "force-dynamic";

const COLUMNS: Partial<Column>[] = [
  { header: "Title", key: "title", width: 40 },
  { header: "Quarter", key: "quarter", width: 12 },
  { header: "Module", key: "module", width: 18 },
  { header: "Priority", key: "priority", width: 12 },
  { header: "Status", key: "status", width: 14 },
  { header: "Progress %", key: "progressPct", width: 12 },
  { header: "Assignee", key: "assignee", width: 20 },
  { header: "Created By", key: "createdBy", width: 20 },
  { header: "Due Date", key: "dueDate", width: 14 },
  { header: "Source", key: "source", width: 28 },
  { header: "Value Add", key: "valueAdd", width: 28 },
  { header: "Impact Areas", key: "impactAreas", width: 24 },
  { header: "Jira URL", key: "jiraUrl", width: 24 },
  { header: "Confluence URL", key: "confluenceUrl", width: 24 },
  { header: "Figma URL", key: "figmaUrl", width: 24 },
  { header: "Escalated", key: "escalated", width: 12 },
  { header: "Escalation Note", key: "escalationNote", width: 28 },
  { header: "Escalation Raised By", key: "escalationRaisedBy", width: 20 },
  { header: "Escalation Resolved", key: "escalationResolved", width: 14 },
  { header: "Created At", key: "createdAt", width: 20 },
  { header: "Updated At", key: "updatedAt", width: 20 },
];

function formatDate(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "MMM d, yyyy");
}

function formatDateTime(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "MMM d, yyyy h:mm a");
}

function escalationSummary(task: TaskListItem) {
  const escalations = task.escalations ?? [];
  const open = escalations.filter((e) => !e.resolved);
  return {
    escalated: open.length > 0 ? "Yes" : "No",
    escalationNote: open.map((e) => e.note).join(" | "),
    escalationRaisedBy: open.map((e) => e.raiser?.name ?? "Unknown").join(", "),
    // "Resolved" only makes sense once at least one escalation has ever been
    // raised; a task with none is neither escalated nor resolved.
    escalationResolved: escalations.length > 0 && open.length === 0 ? "Yes" : "No",
  };
}

function taskRow(task: TaskListItem) {
  const escalation = escalationSummary(task);
  return {
    title: task.title,
    quarter: task.quarter,
    module: task.module,
    priority: task.priority,
    status: task.status,
    progressPct: task.progressPct,
    assignee: task.assignees.length > 0 ? task.assignees.map((a) => a.name).join(", ") : "Unassigned",
    createdBy: task.creator?.name ?? "",
    dueDate: formatDate(task.dueDate),
    source: task.source ?? "",
    valueAdd: task.valueAdd ?? "",
    impactAreas: (task.impactAreas ?? []).join(", "),
    jiraUrl: task.jiraUrl ?? "",
    confluenceUrl: task.confluenceUrl ?? "",
    figmaUrl: task.figmaUrl ?? "",
    escalated: escalation.escalated,
    escalationNote: escalation.escalationNote,
    escalationRaisedBy: escalation.escalationRaisedBy,
    escalationResolved: escalation.escalationResolved,
    createdAt: formatDateTime(task.createdAt),
    updatedAt: formatDateTime(task.updatedAt),
  };
}

const NAMED_SHEETS = [
  { sheetName: "Prashant", matches: "prashant" },
  { sheetName: "Ankur", matches: "ankur" },
  { sheetName: "Harshit", matches: "harshit" },
] as const;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = await getVisibilityScope(user);
  const allTasks =
    scope.kind === "none"
      ? []
      : await db.query.tasks.findMany({
          with: {
            creator: true,
            escalations: { with: { raiser: true, taggedUser: true, resolver: true } },
          },
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        });

  // Same passwordHash/tokenVersion leak risk as the other routes if these
  // full user rows were ever serialized directly — sanitize before use, even
  // though today only `.name` is read off of them for the Excel cells.
  const sanitizedTasks = allTasks.map((t) => ({
    ...t,
    escalations: t.escalations.map(sanitizeEscalation),
  }));

  const allTasksWithAssignees = await resolveAssignees(sanitizedTasks);

  const visibleTasks = allTasksWithAssignees.filter((task) =>
    taskVisibleUnderScope(scope, task, user)
  );

  const workbook = new Workbook();
  workbook.creator = "Product Tracker";
  workbook.created = new Date();

  const buckets: Record<string, TaskListItem[]> = {
    Prashant: [],
    Ankur: [],
    Harshit: [],
  };
  const other: TaskListItem[] = [];

  for (const task of visibleTasks) {
    const assigneeNames = task.assignees.map((a) => a.name.toLowerCase());
    const matches = NAMED_SHEETS.filter((s) =>
      assigneeNames.some((name) => name.includes(s.matches))
    );
    if (matches.length > 0) {
      // A task can have multiple assignees, so it may land on more than one
      // named sheet — duplication across sheets is intentional.
      for (const match of matches) {
        buckets[match.sheetName].push(task);
      }
    } else {
      other.push(task);
    }
  }

  for (const { sheetName } of NAMED_SHEETS) {
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.columns = COLUMNS;
    sheet.getRow(1).font = { bold: true };
    for (const task of buckets[sheetName]) {
      sheet.addRow(taskRow(task));
    }
  }

  if (other.length > 0) {
    const sheet = workbook.addWorksheet("Unassigned - Other", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.columns = COLUMNS;
    sheet.getRow(1).font = { bold: true };
    for (const task of other) {
      sheet.addRow(taskRow(task));
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `product-tracker-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
