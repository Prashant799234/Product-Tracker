import { inArray } from "drizzle-orm";
import { db, users, type Task } from "./db";
import { toPublicUser, type PublicUser } from "./auth";

/**
 * Resolves each task's `assigneeIds` (a plain array of user ids on the
 * `tasks` row) to full `assignees: PublicUser[]` objects, in a single query
 * regardless of how many tasks are passed in.
 *
 * Tasks with multiple assignees replace the old single `assignedTo` FK/
 * relation — that column is still physically present (and still readable on
 * the returned rows) but is no longer used to drive the UI.
 */
export async function resolveAssignees<T extends Pick<Task, "assigneeIds">>(
  tasksList: T[]
): Promise<(T & { assignees: PublicUser[] })[]> {
  const ids = new Set<string>();
  for (const task of tasksList) {
    for (const id of task.assigneeIds ?? []) ids.add(id);
  }

  const userRows = ids.size > 0
    ? await db.select().from(users).where(inArray(users.id, [...ids]))
    : [];

  const byId = new Map(userRows.map((u) => [u.id, toPublicUser(u)]));

  return tasksList.map((task) => ({
    ...task,
    assignees: (task.assigneeIds ?? [])
      .map((id) => byId.get(id))
      .filter((u): u is PublicUser => !!u),
  }));
}
