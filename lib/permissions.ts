import { eq } from "drizzle-orm";
import { db, shares, users, type Task, type User } from "./db";

/** Members/admins can create tasks and comment on anything; viewers can only
 * comment. Both can be granted `canManageUsers`. */
export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "admin";
}

export function isViewer(user: Pick<User, "role">): boolean {
  return user.role === "viewer";
}

/** Can this user edit the task's own fields (status, progress, assignment,
 * severity, quarter, due date, module, description, source/value/links)? */
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

/** Only admin can hard-delete a task. */
export function canDeleteTask(user: Pick<User, "role">): boolean {
  return user.role === "admin";
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

/** Whether `actor` (who already has canManageUsers) may change the role or
 * active-status of `target`. A plain viewer can be managed by any
 * can_manage_users user; anyone with canManageUsers themselves (i.e. another
 * admin or member) can only be managed by an admin. */
export function canManageTargetUser(
  actor: Pick<User, "id" | "role">,
  target: Pick<User, "id" | "canManageUsers">
): boolean {
  if (target.canManageUsers) {
    return actor.role === "admin";
  }
  return true;
}

/** Describes which tasks a viewer's `shares` grant them read access to. */
export type VisibilityScope =
  | { kind: "all" }
  | { kind: "modules"; modules: string[] }
  | { kind: "none" };

/** Members and admins see every task; viewers are scoped by their `shares`
 * rows (a dashboard-scope share sees everything, module-scope shares are
 * limited to those modules). */
export async function getVisibilityScope(
  user: Pick<User, "id" | "role">
): Promise<VisibilityScope> {
  if (user.role !== "viewer") return { kind: "all" };

  const rows = await db.select().from(shares).where(eq(shares.userId, user.id));
  if (rows.some((s) => s.scope === "dashboard")) return { kind: "all" };

  const modules = rows
    .filter((s) => s.scope === "module" && s.module)
    .map((s) => s.module as string);

  if (modules.length === 0) return { kind: "none" };
  return { kind: "modules", modules };
}

export function taskVisibleUnderScope(scope: VisibilityScope, task: Pick<Task, "module">): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "none") return false;
  return scope.modules.includes(task.module);
}

/** Full check for a single task, used by the task-detail route. */
export async function canViewTask(
  user: Pick<User, "id" | "role">,
  task: Pick<Task, "module">
): Promise<boolean> {
  if (user.role !== "viewer") return true;
  const scope = await getVisibilityScope(user);
  return taskVisibleUnderScope(scope, task);
}

/** Guard against ever having zero active admins in the system. */
export async function wouldRemoveLastActiveAdmin(
  targetUserId: string,
  nextIsActive: boolean,
  nextRole: string
): Promise<boolean> {
  const willStillBeActiveAdmin = nextIsActive && nextRole === "admin";
  if (willStillBeActiveAdmin) return false;

  const allUsers = await db.select().from(users);
  const target = allUsers.find((u) => u.id === targetUserId);
  if (!target) return false;
  const wasActiveAdmin = target.isActive && target.role === "admin";
  if (!wasActiveAdmin) return false;

  const otherActiveAdmins = allUsers.filter(
    (u) => u.id !== targetUserId && u.isActive && u.role === "admin"
  );
  return otherActiveAdmins.length === 0;
}
