"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { PublicUser } from "@/types";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * Fetches the current session on mount and exposes it via context. Renders
 * nothing (a blank shell) while loading and redirects to /login on a 401 —
 * this is a client-side convenience layered on top of middleware (which
 * already redirects unauthenticated page loads) and is not itself a security
 * boundary; every API route independently re-verifies the session.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await api.get<{ user: PublicUser }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!loading && user?.mustChangePassword) {
      if (typeof window !== "undefined" && window.location.pathname !== "/change-password") {
        router.replace("/change-password");
      }
    }
  }, [loading, user, router]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
