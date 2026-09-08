"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api-client";
import { InviteUserDialog } from "@/components/users/invite-user-dialog";
import { UsersTable } from "@/components/users/users-table";
import type { PublicUser } from "@/types";
import type { UserRole } from "@/lib/enums";

export function UsersClient() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = React.useState<PublicUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ users: PublicUser[] }>("/api/users");
      setUsers(data.users);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (currentUser && !currentUser.canManageUsers) {
      router.replace("/");
    }
  }, [currentUser, router]);

  async function withErrorHandling(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  if (!currentUser || !currentUser.canManageUsers) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">User Management</h1>
          <p className="text-sm text-text-faint">Invite teammates and manage access.</p>
        </div>
        <InviteUserDialog onInvited={(user) => setUsers((prev) => [...prev, user])} />
      </div>

      {error && <p className="rounded-md bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

      {loading ? (
        <p className="text-sm text-text-faint">Loading...</p>
      ) : (
        <UsersTable
          users={users}
          currentUser={currentUser}
          onRoleChange={(userId, role: UserRole) =>
            withErrorHandling(async () => {
              const data = await api.patch<{ user: PublicUser }>(`/api/users/${userId}`, { role });
              setUsers((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
            })
          }
          onToggleActive={(userId, isActive) =>
            withErrorHandling(async () => {
              const data = await api.patch<{ user: PublicUser }>(`/api/users/${userId}`, {
                isActive,
              });
              setUsers((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
            })
          }
          onForceLogout={(userId) =>
            withErrorHandling(async () => {
              await api.patch(`/api/users/${userId}`, { forceLogout: true });
            })
          }
        />
      )}
    </div>
  );
}
