"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TaskDetailContent } from "@/components/tasks/task-detail-client";

/**
 * Renders the full task-detail content (overview, origin & value, links,
 * documents, to-dos, comments, activity timeline) inside a right-side
 * slide-over so the dashboard doesn't have to navigate away. `/tasks/[id]`
 * keeps working as a real page for direct links / refresh / sharing — the
 * "Open full page" link below is the deep-link escape hatch out of the sheet.
 */
export function TaskDetailSheet({
  taskId,
  open,
  onOpenChange,
  onChanged,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {taskId && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between pr-2">
                <SheetTitle>Task details</SheetTitle>
                <Link
                  href={`/tasks/${taskId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-brand-blue hover:underline"
                >
                  Open full page
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </SheetHeader>
            <TaskDetailContent
              taskId={taskId}
              backHref=""
              onDeleted={() => onOpenChange(false)}
              onChanged={onChanged}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
