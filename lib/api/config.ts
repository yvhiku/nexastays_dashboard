function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function resolveDashboardApiUrl(
  configured: string | undefined,
  fallback: string,
  label: string,
): string {
  const value = (configured ?? "").trim();
  if (process.env.NODE_ENV === "production") {
    if (!value) {
      throw new Error(
        `${label} is required when NODE_ENV=production (no loopback fallback).`,
      );
    }
    try {
      if (isLoopbackHostname(new URL(value).hostname)) {
        throw new Error(
          `${label} must not target localhost / 127.0.0.1 / ::1 when NODE_ENV=production.`,
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes(label)) throw err;
      throw new Error(`${label} must be a valid URL.`);
    }
    return value.replace(/\/$/, "");
  }
  return (value || fallback).replace(/\/$/, "");
}

export const apiConfig = {
  get staysBaseUrl(): string {
    return resolveDashboardApiUrl(
      process.env.NEXT_PUBLIC_STAYS_API_URL,
      "http://127.0.0.1:3002/api/v1",
      "NEXT_PUBLIC_STAYS_API_URL",
    );
  },
  get identityBaseUrl(): string {
    return resolveDashboardApiUrl(
      process.env.NEXT_PUBLIC_IDENTITY_API_URL,
      "http://127.0.0.1:3001/api/v1",
      "NEXT_PUBLIC_IDENTITY_API_URL",
    );
  },
};
