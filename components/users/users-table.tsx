"use client";

import { format } from "date-fns";
import { LogOut, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManageSharesDialog } from "@/components/users/manage-shares-dialog";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { USER_ROLES, type UserRole } from "@/lib/enums";
import type { PublicUser } from "@/types";

function canManage(actor: PublicUser, target: PublicUser): boolean {
  if (target.canManageUsers) return actor.role === "admin";
  return true;
}

export function UsersTable({
  users,
  currentUser,
  onRoleChange,
  onToggleActive,
  onForceLogout,
}: {
  users: PublicUser[];
  currentUser: PublicUser;
  onRoleChange: (userId: string, role: UserRole) => Promise<void>;
  onToggleActive: (userId: string, isActive: boolean) => Promise<void>;
  onForceLogout: (userId: string) => Promise<void>;
}) {
  const activeAdminCount = users.filter((u) => u.role === "admin" && u.isActive).length;

  return (
    <div className="overflow-x-auto rounded-lg border border-text-muted/10">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-text-muted/10 bg-surface-1 text-xs uppercase tracking-wide text-text-dim">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const editable = canManage(currentUser, user);
            const isOnlyActiveAdmin = user.role === "admin" && user.isActive && activeAdminCount <= 1;
            return (
              <tr key={user.id} className="border-b border-text-muted/5 bg-surface-1 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-text-primary">{user.name}</span>
                    <span className="text-xs text-text-dim">{user.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {editable ? (
                    <Select
                      value={user.role}
                      onValueChange={(v) => onRoleChange(user.id, v as UserRole)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="capitalize">
                      {user.role}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.isActive ? "success" : "critical"}>
                    {user.isActive ? "Active" : "Deactivated"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-text-faint">
                  {format(new Date(user.createdAt), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {user.role === "viewer" && <ManageSharesDialog user={user} />}
                    {editable && (
                      <>
                        <ResetPasswordDialog user={user} />
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={user.isActive && isOnlyActiveAdmin}
                          title={
                            user.isActive && isOnlyActiveAdmin
                              ? "Cannot deactivate the only active admin"
                              : undefined
                          }
                          onClick={() => onToggleActive(user.id, !user.isActive)}
                        >
                          <Power className="h-4 w-4" />
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onForceLogout(user.id)}>
                          <LogOut className="h-4 w-4" />
                          Force logout
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
