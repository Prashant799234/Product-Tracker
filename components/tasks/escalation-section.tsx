"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TaskDetail } from "@/types";

export function EscalationSection({
  task,
  canRaise,
  canResolve,
  onRaise,
  onResolve,
}: {
  task: TaskDetail;
  canRaise: boolean;
  canResolve: boolean;
  onRaise: (note: string) => Promise<void>;
  onResolve: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const isOpenEscalation = task.isEscalated && !task.escalationResolved;

  async function handleRaise() {
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await onRaise(note.trim());
      setOpen(false);
      setNote("");
    } finally {
      setSubmitting(false);
    }
  }

  if (isOpenEscalation) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-critical/40 bg-critical/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
          <div>
            <p className="text-sm font-medium text-critical">
              Escalated by {task.escalator?.name ?? "someone"}
            </p>
            {task.escalationNote && (
              <p className="text-sm text-text-secondary">&ldquo;{task.escalationNote}&rdquo;</p>
            )}
          </div>
        </div>
        {canResolve && (
          <Button size="sm" variant="destructive" onClick={onResolve}>
            <CheckCircle2 className="h-4 w-4" />
            Resolve
          </Button>
        )}
      </div>
    );
  }

  if (!canRaise) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="self-start border-critical/40 text-critical hover:bg-critical/10">
          <AlertTriangle className="h-4 w-4" />
          Raise escalation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise an escalation</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="What needs attention?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <DialogFooter>
          <Button variant="destructive" disabled={submitting} onClick={handleRaise}>
            {submitting ? "Raising..." : "Raise escalation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
