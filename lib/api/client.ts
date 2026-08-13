import { apiConfig } from "./config";

/** In-memory admin access JWT (ADR-005). Refresh uses HttpOnly cookie when transport=cookie. */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isNotImplemented(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 501);
}

type FetchOptions = RequestInit & { base?: "stays" | "identity" };

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const base =
    options.base === "identity"
      ? apiConfig.identityBaseUrl
      : apiConfig.staysBaseUrl;
  const token = getAccessToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    // Refresh cookie only — access authorization is Bearer (PROD-SEC-001).
    "X-Auth-Transport": "cookie",
    ...(options.headers as Record<string, string>),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const err = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(err.message)) message = err.message.join(", ");
      else if (err.message) message = err.message;
    } catch {
      // ignore
    }
    if (res.status === 401 && typeof window !== "undefined") {
      clearAccessToken();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
