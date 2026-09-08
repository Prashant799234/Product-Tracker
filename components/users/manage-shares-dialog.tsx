"use client";

import * as React from "react";
import { Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import type { Share, ShareScope } from "@/lib/db";
import type { PublicUser } from "@/types";

export function ManageSharesDialog({ user }: { user: PublicUser }) {
  const [open, setOpen] = React.useState(false);
  const [shares, setShares] = React.useState<Share[]>([]);
  const [scope, setScope] = React.useState<ShareScope>("dashboard");
  const [module, setModule] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ shares: Share[] }>(`/api/shares?userId=${user.id}`);
      setShares(data.shares);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function handleGrant() {
    if (scope === "module" && !module.trim()) return;
    await api.post("/api/shares", { userId: user.id, scope, module: module.trim() || undefined });
    setModule("");
    load();
  }

  async function handleRevoke(shareId: string) {
    await api.del("/api/shares", { shareId });
    load();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Share2 className="h-4 w-4" />
          Shares
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage access for {user.name}</DialogTitle>
          <DialogDescription>
            Grant read-only access to the whole dashboard, or scope it to specific modules.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {loading && <p className="text-sm text-text-dim">Loading...</p>}
          {!loading && shares.length === 0 && (
            <p className="text-sm text-text-dim">No access granted yet.</p>
          )}
          {shares.map((share) => (
            <div key={share.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2">
              <Badge variant={share.scope === "dashboard" ? "blue" : "outline"}>
                {share.scope === "dashboard" ? "Whole dashboard" : `Module: ${share.module}`}
              </Badge>
              <button
                onClick={() => handleRevoke(share.id)}
                className="text-text-dim transition-colors hover:text-critical"
                aria-label="Revoke access"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>Scope</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as ShareScope)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Whole dashboard</SelectItem>
                <SelectItem value="module">Specific module</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope === "module" && (
            <div className="flex flex-1 flex-col gap-1.5">
              <Label>Module</Label>
              <Input value={module} onChange={(e) => setModule(e.target.value)} placeholder="e.g. Billing" />
            </div>
          )}
          <Button size="sm" onClick={handleGrant}>
            Grant
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
