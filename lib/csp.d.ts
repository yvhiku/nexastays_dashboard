/** Type declarations for lib/csp.js (CommonJS, SEC-010). */
export function originOf(value?: string | null): string | undefined;

export function buildDashboardCsp(opts?: {
  isDev?: boolean;
  identityApiUrl?: string;
  staysApiUrl?: string;
  nonce?: string;
}): string;

export function assertDashboardCspInvariants(
  csp: string,
  opts?: { allowUnsafeEval?: boolean },
): true;
