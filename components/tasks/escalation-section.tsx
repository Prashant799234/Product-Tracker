"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { canResolveEscalation } from "@/lib/task-rules";
import type { PublicUser, TaskDetail } from "@/types";

const NO_TAG = "__none__";

export function EscalationSection({
  task,
  canRaise,
  currentUser,
  users,
  onRaise,
  onResolve,
}: {
  task: TaskDetail;
  canRaise: boolean;
  currentUser: PublicUser;
  users: PublicUser[];
  onRaise: (note: string, taggedUserId?: string) => Promise<void>;
  onResolve: (escalationId: string) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [taggedUserId, setTaggedUserId] = React.useState(NO_TAG);
  const [submitting, setSubmitting] = React.useState(false);
  const [resolvingId, setResolvingId] = React.useState<string | null>(null);

  const openEscalations = task.escalations.filter((e) => !e.resolved);

  async function handleRaise() {
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await onRaise(note.trim(), taggedUserId === NO_TAG ? undefined : taggedUserId);
      setOpen(false);
      setNote("");
      setTaggedUserId(NO_TAG);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResolve(escalationId: string) {
    setResolvingId(escalationId);
    try {
      await onResolve(escalationId);
    } finally {
      setResolvingId(null);
    }
  }

  if (openEscalations.length === 0 && !canRaise) return null;

  return (
    <div className="flex flex-col gap-2">
      {openEscalations.map((escalation) => (
        <div
          key={escalation.id}
          className="flex flex-col gap-2 rounded-lg border border-critical/40 bg-critical/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
            <div>
              <p className="text-sm font-medium text-critical">
                Escalated by {escalation.raiser?.name ?? "someone"}
                {escalation.taggedUser && ` → tagged ${escalation.taggedUser.name}`}
              </p>
              {escalation.note && (
                <p className="text-sm text-text-secondary">&ldquo;{escalation.note}&rdquo;</p>
              )}
            </div>
          </div>
          {canResolveEscalation(currentUser, escalation) && (
            <Button
              size="sm"
              variant="destructive"
              disabled={resolvingId === escalation.id}
              onClick={() => handleResolve(escalation.id)}
            >
              <CheckCircle2 className="h-4 w-4" />
              {resolvingId === escalation.id ? "Resolving..." : "Resolve"}
            </Button>
          )}
        </div>
      ))}

      {canRaise && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="self-start border-critical/40 text-critical hover:bg-critical/10"
            >
              <AlertTriangle className="h-4 w-4" />
              Raise escalation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Raise an escalation</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Textarea
                placeholder="What needs attention?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-faint">
                  Tag someone (optional)
                </label>
                <Select value={taggedUserId} onValueChange={setTaggedUserId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TAG}>No one</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={submitting || !note.trim()}
                onClick={handleRaise}
              >
                {submitting ? "Raising..." : "Raise escalation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
