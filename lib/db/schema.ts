import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  date,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums are represented as text columns (validated at the application layer
// with zod) so that drizzle-kit push works against a plain Postgres/Neon
// database without needing native enum type migrations. The constant arrays
// themselves live in `lib/enums.ts` (re-exported below) so that client
// components can import them without pulling in the database client.
export {
  USER_ROLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  SHARE_SCOPES,
  TASK_EVENT_TYPES,
  IMPACT_AREAS,
  type UserRole,
  type TaskPriority,
  type TaskStatus,
  type ShareScope,
  type TaskEventType,
  type ImpactArea,
} from "../enums";
import {
  USER_ROLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  SHARE_SCOPES,
  TASK_EVENT_TYPES,
  type UserRole,
  type TaskPriority,
  type TaskStatus,
  type ShareScope,
  type TaskEventType,
} from "../enums";

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().notNull().default("member"),
  canManageUsers: boolean("can_manage_users").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  tokenVersion: integer("token_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  quarter: text("quarter").notNull(),
  module: text("module").notNull(),
  // NOTE: the underlying Postgres column is still physically named
  // "severity" — only the Drizzle/TypeScript field key has been renamed to
  // `priority`. A manual `ALTER TABLE tasks RENAME COLUMN severity TO
  // priority` can be run later, separately, with care around existing data.
  priority: text("severity").$type<TaskPriority>().notNull().default("Medium"),
  status: text("status").$type<TaskStatus>().notNull().default("To Do"),
  progressPct: integer("progress_pct").notNull().default(0),
  assignedTo: uuid("assigned_to").references((): any => users.id),
  createdBy: uuid("created_by")
    .references((): any => users.id)
    .notNull(),
  dueDate: date("due_date"),
  source: text("source"),
  valueAdd: text("value_add"),
  // Fixed taxonomy of what this task impacts (see IMPACT_AREAS in
  // lib/enums.ts). Purely additive column — nullable, defaults to empty.
  impactAreas: text("impact_areas").array().default([]),
  jiraUrl: text("jira_url"),
  confluenceUrl: text("confluence_url"),
  figmaUrl: text("figma_url"),
  dependencyId: uuid("dependency_id").references((): any => tasks.id),
  isEscalated: boolean("is_escalated").notNull().default(false),
  escalationNote: text("escalation_note"),
  escalatedBy: uuid("escalated_by").references((): any => users.id),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  escalationResolved: boolean("escalation_resolved").notNull().default(false),
  escalationResolvedBy: uuid("escalation_resolved_by"),
  escalationResolvedAt: timestamp("escalation_resolved_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const taskLinks = pgTable("task_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const taskDocuments = pgTable("task_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const taskTodos = pgTable("task_todos", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "cascade" })
    .notNull(),
  text: text("text").notNull(),
  isDone: boolean("is_done").notNull().default(false),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "cascade" })
    .notNull(),
  authorId: uuid("author_id")
    .references(() => users.id)
    .notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const taskEvents = pgTable("task_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "cascade" })
    .notNull(),
  actorId: uuid("actor_id")
    .references(() => users.id)
    .notNull(),
  eventType: text("event_type").$type<TaskEventType>().notNull(),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const shares = pgTable("shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  scope: text("scope").$type<ShareScope>().notNull(),
  module: text("module"),
  grantedBy: uuid("granted_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations (used for nested `with` queries)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  assignedTasks: many(tasks, { relationName: "assignee" }),
  createdTasks: many(tasks, { relationName: "creator" }),
  escalatedTasks: many(tasks, { relationName: "escalator" }),
  shares: many(shares, { relationName: "shareUser" }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "assignee",
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "creator",
  }),
  escalator: one(users, {
    fields: [tasks.escalatedBy],
    references: [users.id],
    relationName: "escalator",
  }),
  dependency: one(tasks, {
    fields: [tasks.dependencyId],
    references: [tasks.id],
  }),
  links: many(taskLinks),
  documents: many(taskDocuments),
  todos: many(taskTodos),
  comments: many(taskComments),
  events: many(taskEvents),
}));

export const taskLinksRelations = relations(taskLinks, ({ one }) => ({
  task: one(tasks, { fields: [taskLinks.taskId], references: [tasks.id] }),
  creator: one(users, { fields: [taskLinks.createdBy], references: [users.id] }),
}));

export const taskDocumentsRelations = relations(taskDocuments, ({ one }) => ({
  task: one(tasks, { fields: [taskDocuments.taskId], references: [tasks.id] }),
  creator: one(users, {
    fields: [taskDocuments.createdBy],
    references: [users.id],
  }),
}));

export const taskTodosRelations = relations(taskTodos, ({ one }) => ({
  task: one(tasks, { fields: [taskTodos.taskId], references: [tasks.id] }),
  creator: one(users, { fields: [taskTodos.createdBy], references: [users.id] }),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
  author: one(users, { fields: [taskComments.authorId], references: [users.id] }),
}));

export const taskEventsRelations = relations(taskEvents, ({ one }) => ({
  task: one(tasks, { fields: [taskEvents.taskId], references: [tasks.id] }),
  actor: one(users, { fields: [taskEvents.actorId], references: [users.id] }),
}));

export const sharesRelations = relations(shares, ({ one }) => ({
  user: one(users, {
    fields: [shares.userId],
    references: [users.id],
    relationName: "shareUser",
  }),
  grantor: one(users, { fields: [shares.grantedBy], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskLink = typeof taskLinks.$inferSelect;
export type TaskDocument = typeof taskDocuments.$inferSelect;
export type TaskTodo = typeof taskTodos.$inferSelect;
export type TaskComment = typeof taskComments.$inferSelect;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type Share = typeof shares.$inferSelect;
