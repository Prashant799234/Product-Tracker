"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users as UsersIcon, KeyRound, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await api.post("/api/auth/logout").catch(() => {});
    router.replace("/login");
  }

  if (loading || !user) {
    return <div className="min-h-screen bg-surface" />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-text-muted/10 bg-surface-1/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center rounded-md bg-white px-2.5 py-1.5">
            <Image src="/polarin-logo.svg" alt="Polarin" width={104} height={24} priority />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange">
              <Avatar>
                <AvatarFallback>{user.initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm text-text-secondary sm:inline">{user.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="text-sm font-medium text-text-primary">{user.name}</span>
                <span className="text-xs text-text-dim">{user.email}</span>
                <Badge variant="outline" className="mt-1 w-fit capitalize">
                  {user.role}
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.canManageUsers && (
                <DropdownMenuItem onClick={() => router.push("/users")}>
                  <UsersIcon className="mr-2 h-4 w-4" />
                  User Management
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => router.push("/change-password")}>
                <KeyRound className="mr-2 h-4 w-4" />
                Change password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-critical focus:text-critical">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
