"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  adminLogin,
  adminLogout,
  fetchAdminSession,
  type AdminSession,
} from "@/lib/api/auth";
import { clearAccessToken, getAccessToken } from "@/lib/api/client";
import {
  canAccessDashboardPath,
  getDefaultDashboardRoute,
  isSupportAgent,
} from "@/lib/rbac";

type AuthContextValue = {
  token: string | null;
  session: AdminSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    void fetchAdminSession().then((next) => {
      if (next?.authenticated) {
        setSession(next);
        setToken(getAccessToken() || "cookie-session");
      } else if (getAccessToken()) {
        setToken(getAccessToken());
      } else {
        setToken(null);
        setSession(null);
      }
      setAuthReady(true);
    });
  }, []);

  const agentBlocked =
    authReady &&
    Boolean(token) &&
    isSupportAgent(session) &&
    !canAccessDashboardPath(session, pathname);

  useEffect(() => {
    if (!authReady) return;
    if (!token && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    if (token && pathname === "/login") {
      router.replace(getDefaultDashboardRoute(session));
      return;
    }
    if (agentBlocked) {
      router.replace("/support");
    }
  }, [authReady, token, pathname, router, session, agentBlocked]);

  const login = useCallback(async (email: string, password: string) => {
    const t = await adminLogin(email, password);
    setToken(t);
    const next = await fetchAdminSession();
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    void adminLogout().catch(() => {});
    clearAccessToken();
    setToken(null);
    setSession(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ token, session, login, logout }),
    [token, session, login, logout],
  );

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-nexa-ink-4">
        Loading…
      </div>
    );
  }

  if (agentBlocked) {
    return (
      <AuthContext.Provider value={value}>
        <div className="flex min-h-screen items-center justify-center text-sm text-nexa-ink-4">
          Redirecting…
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
