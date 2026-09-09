import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskEvent, TaskEventType, User } from "@/lib/db";

type EventWithActor = TaskEvent & { actor: Pick<User, "id" | "name"> | null };

function describeEvent(event: EventWithActor): string {
  const detail = (event.detail ?? {}) as Record<string, unknown>;
  const type: TaskEventType = event.eventType as TaskEventType;

  switch (type) {
    case "created":
      return `created this task${detail.title ? ` "${detail.title}"` : ""}`;
    case "status_changed":
      return `changed status from "${detail.from}" to "${detail.to}"`;
    case "assigned_changed": {
      const to = Array.isArray(detail.to) ? (detail.to as string[]) : [];
      return to.length > 0
        ? `changed assignees (now ${to.length} assigned)`
        : `unassigned the task`;
    }
    case "priority_changed":
      return `changed priority from "${detail.from}" to "${detail.to}"`;
    case "quarter_changed":
      return `moved the task from ${detail.from} to ${detail.to}`;
    case "progress_changed":
      return `updated progress from ${detail.from}% to ${detail.to}%`;
    case "escalated":
      return `raised an escalation${detail.note ? `: "${detail.note}"` : ""}${
        detail.taggedUserName ? ` (tagged ${detail.taggedUserName})` : ""
      }`;
    case "escalation_resolved":
      return `resolved the escalation`;
    case "comment_added":
      return `added a comment`;
    case "todo_added":
      return `added a to-do${detail.text ? `: "${detail.text}"` : ""}`;
    case "todo_completed":
      return `completed a to-do${detail.text ? `: "${detail.text}"` : ""}`;
    case "document_added":
      return `added a document${detail.title ? `: "${detail.title}"` : ""}`;
    case "link_added":
      return `added a link${detail.label ? `: "${detail.label}"` : ""}`;
    case "edited":
      return `edited ${Array.isArray(detail.fields) ? (detail.fields as string[]).join(", ") : "task details"}`;
    default:
      return "updated the task";
  }
}

export function TaskTimeline({ events }: { events: EventWithActor[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 && <p className="text-sm text-text-dim">No activity yet.</p>}
        <ol className="flex flex-col gap-4">
          {events
            .slice()
            .reverse()
            .map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
                <div className="flex flex-1 flex-col">
                  <span className="text-text-secondary">
                    <span className="font-medium text-text-primary">
                      {event.actor?.name ?? "Someone"}
                    </span>{" "}
                    {describeEvent(event)}
                  </span>
                  <span className="text-xs text-text-dim">
                    {format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </li>
            ))}
        </ol>
      </CardContent>
    </Card>
  );
}
