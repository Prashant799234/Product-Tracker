"use client";

import { AuthProvider } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default function DashboardPage() {
  return (
    <AuthProvider>
      <AppShell>
        <DashboardClient />
      </AppShell>
    </AuthProvider>
  );
}
