import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildDashboardCsp } from "@/lib/csp";

/**
 * SEC-010: attach a per-request CSP with a script nonce.
 * Other static security headers remain in next.config.js.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const isDev = process.env.NODE_ENV !== "production";
  const csp = buildDashboardCsp({
    isDev,
    identityApiUrl: process.env.NEXT_PUBLIC_IDENTITY_API_URL,
    staysApiUrl: process.env.NEXT_PUBLIC_STAYS_API_URL,
    nonce,
  });

  response.headers.set("Content-Security-Policy", csp);
  // Expose nonce for Server Components that need it (layout / future Script tags).
  response.headers.set("x-nonce", nonce);

  return response;
}

export const config = {
  matcher: [
    /*
      Apply CSP to document navigations and app routes.
      Skip Next static assets and common image extensions (CSP still covers HTML).
    */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    },
  ],
};
