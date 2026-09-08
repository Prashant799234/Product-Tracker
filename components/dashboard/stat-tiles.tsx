import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TaskListItem } from "@/types";
import { isOverdue } from "@/lib/quarters";

export function StatTiles({ tasks }: { tasks: TaskListItem[] }) {
  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const blocked = tasks.filter((t) => t.status === "Blocked").length;
  const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
  const done = tasks.filter((t) => t.status === "Done").length;

  const tiles = [
    { label: "Total", value: total, accent: "text-text-primary" },
    { label: "In Progress", value: inProgress, accent: "text-brand-blue" },
    { label: "Blocked", value: blocked, accent: "text-critical" },
    { label: "Overdue", value: overdue, accent: "text-brand-orange" },
    { label: "Done", value: done, accent: "text-success" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-text-dim">
              {tile.label}
            </span>
            <span className={cn("text-2xl font-semibold", tile.accent)}>{tile.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
