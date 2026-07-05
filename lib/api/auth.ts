import { apiFetch, setAccessToken } from "./client";

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
