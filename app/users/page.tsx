"use client";

import { AuthProvider } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { UsersClient } from "@/components/users/users-client";

export default function UsersPage() {
  return (
    <AuthProvider>
      <AppShell>
        <UsersClient />
      </AppShell>
    </AuthProvider>
  );
}
