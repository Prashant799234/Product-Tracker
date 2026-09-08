import type { Task, User } from "./db/schema";

/**
 * Pure, DB-free permission rules — importable from client components as well
 * as server route handlers. Anything that needs a database lookup (viewer
 * `shares` scoping, cross-user management rules) lives in `lib/permissions.ts`
 * instead, which re-exports these for server-side use.
 */

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "admin";
}

export function isViewer(user: Pick<User, "role">): boolean {
  return user.role === "viewer";
}

/** Can this user edit the task's own fields (status, progress, assignment,
 * priority, quarter, due date, module, description, source/value/links)? */
export function canEditTask(
  user: Pick<User, "id" | "role">,
  task: Pick<Task, "createdBy" | "assignedTo">
): boolean {
  if (user.role === "viewer") return false;
  if (user.role === "admin") return true;
  return task.createdBy === user.id || task.assignedTo === user.id;
}

/** Anyone who can view a task (member, admin, or a viewer with a matching
 * share) can add comments/notes — ownership is irrelevant for commenting. */
export function canComment(user: Pick<User, "role">): boolean {
  return user.role === "admin" || user.role === "member" || user.role === "viewer";
}

/** Admin can delete any task; a member can delete a task they created or are
 * assigned to (same ownership rule as editing) — a viewer never can. */
export function canDeleteTask(
  user: Pick<User, "id" | "role">,
  task: Pick<Task, "createdBy" | "assignedTo">
): boolean {
  return canEditTask(user, task);
}

/** A user may raise an escalation on any task they're allowed to edit. */
export function canRaiseEscalation(
  user: Pick<User, "id" | "role">,
  task: Pick<Task, "createdBy" | "assignedTo">
): boolean {
  return canEditTask(user, task);
}

/** Admin can resolve any escalation; a member/viewer can resolve only the
 * one they raised themselves. */
export function canResolveEscalation(
  user: Pick<User, "id" | "role">,
  task: Pick<Task, "escalatedBy">
): boolean {
  if (user.role === "admin") return true;
  return !!task.escalatedBy && task.escalatedBy === user.id;
}
