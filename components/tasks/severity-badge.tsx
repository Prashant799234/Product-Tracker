import { Badge } from "@/components/ui/badge";
import type { TaskSeverity } from "@/lib/db";

const SEVERITY_VARIANT: Record<TaskSeverity, "critical" | "orange" | "blue" | "default"> = {
  Critical: "critical",
  High: "orange",
  Medium: "blue",
  Low: "default",
};

export function SeverityBadge({ severity }: { severity: TaskSeverity }) {
  return <Badge variant={SEVERITY_VARIANT[severity]}>{severity}</Badge>;
}
