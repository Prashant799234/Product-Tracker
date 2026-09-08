// Plain constant arrays + types shared between server and client code. This
// file must never import the database client (`lib/db`) or any node-only
// module — client components import enums from here instead of from
// `@/lib/db` so bundling a client component never pulls in
// `drizzle-orm/vercel-postgres` (which only works in a Node/edge runtime).

export const USER_ROLES = ["admin", "member", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TASK_SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;
export type TaskSeverity = (typeof TASK_SEVERITIES)[number];

export const TASK_STATUSES = [
  "To Do",
  "In Progress",
  "Blocked",
  "In Review",
  "Done",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const SHARE_SCOPES = ["dashboard", "module"] as const;
export type ShareScope = (typeof SHARE_SCOPES)[number];

export const TASK_EVENT_TYPES = [
  "created",
  "status_changed",
  "assigned_changed",
  "severity_changed",
  "quarter_changed",
  "progress_changed",
  "escalated",
  "escalation_resolved",
  "comment_added",
  "todo_added",
  "todo_completed",
  "document_added",
  "link_added",
  "edited",
] as const;
export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];
