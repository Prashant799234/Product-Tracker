"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api-client";
import type { PublicUser } from "@/types";

export function ResetPasswordDialog({ user }: { user: PublicUser }) {
  const [open, setOpen] = React.useState(false);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleReset() {
    setError(null);
    setSubmitting(true);
    try {
      const data = await api.post<{ tempPassword: string }>(
        `/api/users/${user.id}/reset-password`,
        {}
      );
      setTempPassword(data.tempPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTempPassword(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <KeyRound className="h-4 w-4" />
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {user.name}</DialogTitle>
          <DialogDescription>
            There&apos;s no automated &quot;forgot password&quot; email (this app has no email
            service) — this generates a new temporary password instead.
          </DialogDescription>
        </DialogHeader>

        {tempPassword ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-secondary">
              Share this with {user.name.split(" ")[0]} out-of-band (Slack/WhatsApp) — it
              won&apos;t be shown again. Their old password stops working immediately, and
              they&apos;ll be asked to set a new one on next login.
            </p>
            <code className="rounded-md bg-surface-2 px-3 py-2 text-sm text-brand-orange-tint">
              {tempPassword}
            </code>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              This immediately invalidates {user.name.split(" ")[0]}&apos;s current password and
              signs them out everywhere.
            </p>
            {error && (
              <p className="rounded-md bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
            )}
            <DialogFooter>
              <Button onClick={handleReset} disabled={submitting}>
                {submitting ? "Resetting..." : "Generate new temporary password"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
