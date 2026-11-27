import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "@/services/auth.service";
import { usersService } from "@/services/users.service";
import type { User } from "@/types";

const SESSION_KEY = "scc.session.email";
/** Older builds saved the whole user here, so permissions went stale. Cleared on load. */
const LEGACY_USER_KEY = "scc.session.user";

interface AuthState {
  status: "loading" | "authenticated" | "unauthenticated";
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** True if the user is staff/superuser or holds the given permission codename. */
  hasPerm: (codename: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Tokens live in httpOnly cookies, so the client can't inspect them.
 * GET /users/me/ on load returns the signed-in user with their current
 * permissions (401 means login is required), so role changes show on reload.
 */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await usersService.me();
  } catch (error) {
    // A backend without /users/me/ yet: find the user in the list instead.
    if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
    const page = await usersService.list({ page: 1, page_size: 100 });
    const email = localStorage.getItem(SESSION_KEY);
    return page.results.find((u) => u.email === email) ?? page.results[0] ?? null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [user, setUser] = useState<User | null>(null);
  // Cached lists belong to the person who loaded them: drop them when the user changes.
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    localStorage.removeItem(LEGACY_USER_KEY);
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const onLogout = () => {
      localStorage.removeItem(SESSION_KEY);
      queryClient.clear();
      setUser(null);
      setStatus("unauthenticated");
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    // Login returns the signed-in user with groups and permissions.
    const { user: me } = await authService.login({ email, password });
    localStorage.setItem(SESSION_KEY, email);
    queryClient.clear();
    setUser(me);
    setStatus("authenticated");
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem(SESSION_KEY);
      queryClient.clear();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [queryClient]);

  const hasPerm = useCallback(
    (codename: string) =>
      !!user && (user.is_staff || user.is_superuser || !!user.user_permissions?.includes(codename)),
    [user],
  );

  const value = useMemo(
    () => ({ status, user, login, logout, refreshUser, hasPerm }),
    [status, user, login, logout, refreshUser, hasPerm],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
