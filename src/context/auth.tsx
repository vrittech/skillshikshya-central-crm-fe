import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "@/services/auth.service";
import { usersService } from "@/services/users.service";
import type { User } from "@/types";

const SESSION_KEY = "scc.session.email";
const USER_KEY = "scc.session.user";

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
 * We probe GET /users/ on load: 200 means the cookie session is valid
 * (regular users only get their own profile back); 401 means login is required.
 *
 * The list serializer omits `groups`/`user_permissions`, so we prefer the
 * richer user object persisted at login and only fall back to the probe result.
 */
async function fetchCurrentUser(): Promise<User | null> {
  const page = await usersService.list({ page: 1, page_size: 100 });
  const storedRaw = localStorage.getItem(USER_KEY);
  if (storedRaw) {
    try {
      return JSON.parse(storedRaw) as User;
    } catch {
      // corrupt cache — fall through to probe-derived user
    }
  }
  const email = localStorage.getItem(SESSION_KEY);
  if (email) {
    const match = page.results.find((u) => u.email === email);
    if (match) return match;
  }
  return page.results[0] ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [user, setUser] = useState<User | null>(null);

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
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const onLogout = () => {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
      setStatus("unauthenticated");
    };
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Login returns the authenticated user directly (incl. groups + permissions),
    // so persist it — the /users/ list serializer we probe on reload omits those.
    const { user: me } = await authService.login({ email, password });
    localStorage.setItem(SESSION_KEY, email);
    localStorage.setItem(USER_KEY, JSON.stringify(me));
    setUser(me);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

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

// oxlint-disable-next-line react/only-export-components -- keep this hook next to its context provider.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
