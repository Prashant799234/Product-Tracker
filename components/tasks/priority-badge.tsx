import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/lib/db";

const PRIORITY_VARIANT: Record<TaskPriority, "critical" | "orange" | "blue" | "default"> = {
  Critical: "critical",
  High: "orange",
  Medium: "blue",
  Low: "default",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{priority}</Badge>;
}
