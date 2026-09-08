import { taskEvents, type TaskEventType } from "./db";

// Minimal shape both `db` and a drizzle transaction (`tx`) satisfy.
interface Insertable {
  insert: typeof import("./db").db.insert;
}

/** Records one row in `task_events`. Call this from within the same
 * transaction as the mutation it documents, never from the client. */
export async function logTaskEvent(
  dbOrTx: Insertable,
  params: {
    taskId: string;
    actorId: string;
    eventType: TaskEventType;
    detail?: unknown;
  }
) {
  await dbOrTx.insert(taskEvents).values({
    taskId: params.taskId,
    actorId: params.actorId,
    eventType: params.eventType,
    detail: params.detail ?? null,
  });
}
