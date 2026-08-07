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
import { adminLogin, adminLogout, hasAdminSession } from "@/lib/api/auth";
import { clearAccessToken, getAccessToken } from "@/lib/api/client";

type AuthContextValue = {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const memoryToken = getAccessToken();
    if (memoryToken) {
      setToken(memoryToken);
      setAuthReady(true);
      return;
    }
    void hasAdminSession().then((authenticated) => {
      setToken(authenticated ? "cookie-session" : null);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!token && pathname !== "/login") {
      router.replace("/login");
    } else if (token && pathname === "/login") {
      router.replace("/");
    }
  }, [authReady, token, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const t = await adminLogin(email, password);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    void adminLogout().catch(() => {});
    clearAccessToken();
    setToken(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ token, login, logout }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
