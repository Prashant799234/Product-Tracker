import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/lib/db";

const STATUS_VARIANT: Record<TaskStatus, "default" | "blue" | "critical" | "orange" | "success"> = {
  "To Do": "default",
  "In Progress": "blue",
  Blocked: "critical",
  "In Review": "orange",
  Done: "success",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

export const ALL_STATUSES: TaskStatus[] = [
  "To Do",
  "In Progress",
  "Blocked",
  "In Review",
  "Done",
];
