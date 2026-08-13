import { apiFetch, setAccessToken } from "./client";

export type AdminSessionUser = {
  userId?: string;
  email?: string | null;
  name?: string | null;
  full_name?: string | null;
  role?: string;
  roles?: string[];
};

export type AdminSession = {
  authenticated: boolean;
  userId?: string;
  email?: string | null;
  name?: string | null;
  role?: string;
  roles?: string[];
};

function mapSession(raw: {
  authenticated?: boolean;
  user?: AdminSessionUser;
  email?: string | null;
  name?: string | null;
}): AdminSession | null {
  if (!raw.authenticated) return null;
  const user = raw.user;
  const name =
    user?.name?.trim() ||
    user?.full_name?.trim() ||
    raw.name?.trim() ||
    null;
  const email = user?.email?.trim() || raw.email?.trim() || null;
  const roles = user?.roles?.length
    ? user.roles
    : user?.role
      ? [user.role]
      : [];
  return {
    authenticated: true,
    userId: user?.userId,
    email,
    name: name || (email ? email.split("@")[0] : null),
    role: user?.role || roles[0],
    roles,
  };
}

export async function fetchAdminSession(): Promise<AdminSession | null> {
  try {
    const result = await apiFetch<{
      authenticated?: boolean;
      user?: AdminSessionUser;
      email?: string | null;
      name?: string | null;
    }>("/auth/session", { base: "identity" });
    return mapSession(result);
  } catch {
    return null;
  }
}

export async function adminLogin(email: string, password: string) {
  const data = await apiFetch<{
    access_token?: string;
    accessToken?: string;
    token?: string;
  }>("/auth/admin/login", {
    base: "identity",
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const token = data.access_token ?? data.accessToken ?? data.token;
  if (!token) throw new Error("No access token in login response");
  setAccessToken(token);
  return token;
}

export async function hasAdminSession(): Promise<boolean> {
  const session = await fetchAdminSession();
  return session?.authenticated === true;
}

export async function adminLogout(): Promise<void> {
  await apiFetch("/auth/logout", {
    base: "identity",
    method: "POST",
    body: JSON.stringify({}),
  });
}
