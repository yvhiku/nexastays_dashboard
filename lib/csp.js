/**
 * Dashboard CSP builder (SEC-010).
 * Origins must come from NEXT_PUBLIC_* env — never invent third parties.
 * CommonJS so next.config.js and tests can require it without a bundler.
 */

function originOf(value) {
  if (!value || typeof value !== "string") return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

/**
 * @param {{
 *   isDev?: boolean,
 *   identityApiUrl?: string,
 *   staysApiUrl?: string,
 *   nonce?: string,
 * }} opts
 * @returns {string}
 */
function buildDashboardCsp(opts = {}) {
  const isDev = Boolean(opts.isDev);
  const identityOrigin = originOf(
    opts.identityApiUrl ?? process.env.NEXT_PUBLIC_IDENTITY_API_URL,
  );
  const staysOrigin = originOf(
    opts.staysApiUrl ?? process.env.NEXT_PUBLIC_STAYS_API_URL,
  );
  const nonce = opts.nonce;

  const connectSrc = ["'self'"];
  if (identityOrigin) connectSrc.push(identityOrigin);
  if (staysOrigin) connectSrc.push(staysOrigin);
  // Next.js webpack HMR websocket (dev only) — same host covered by 'self' for
  // typical same-origin HMR; keep explicit localhost for common loopback ports.
  if (isDev) {
    for (const host of ["http://127.0.0.1:3010", "http://localhost:3010"]) {
      const o = originOf(host);
      if (o && !connectSrc.includes(o)) connectSrc.push(o);
    }
    connectSrc.push("ws://127.0.0.1:3010", "ws://localhost:3010");
  }

  // Scripts: prefer nonce (no unsafe-inline). Dev may need unsafe-eval for webpack.
  const scriptSrc = ["'self'"];
  if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`);
    scriptSrc.push("'strict-dynamic'");
  }
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  // Tailwind / React inline style={{...}} require unsafe-inline for styles (accepted residual).
  const styleSrc = ["'self'", "'unsafe-inline'"];

  const imgSrc = ["'self'", "data:", "blob:"];
  const mediaSrc = ["'self'", "blob:"];
  // next/font/google self-hosts under /_next/static — 'self' only.
  const fontSrc = ["'self'"];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `img-src ${imgSrc.join(" ")}`,
    `font-src ${fontSrc.join(" ")}`,
    `media-src ${mediaSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
  ];

  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

/**
 * Assert CSP invariants used by automated tests (SEC-010).
 * @param {string} csp
 * @param {{ allowUnsafeEval?: boolean }} [opts]
 */
function assertDashboardCspInvariants(csp, opts = {}) {
  const allowUnsafeEval = Boolean(opts.allowUnsafeEval);
  if (!csp || typeof csp !== "string") {
    throw new Error("CSP missing");
  }
  if (!/object-src\s+'none'/.test(csp)) {
    throw new Error("object-src must be 'none'");
  }
  if (!/frame-ancestors\s+'none'/.test(csp)) {
    throw new Error("frame-ancestors must be 'none'");
  }
  if (!/base-uri\s+'self'/.test(csp)) {
    throw new Error("base-uri must be 'self'");
  }
  if (!allowUnsafeEval && /unsafe-eval/.test(csp)) {
    throw new Error("unsafe-eval must not appear in production CSP");
  }
  // Reject bare `*` sources and broad `https:` scheme allowlists
  if (/(^|[\s;])\*([\s;]|$)/.test(csp) || /(^|[\s;])https:([\s;]|$)/.test(csp)) {
    throw new Error("wildcard or broad https: sources are not allowed");
  }
  // Disallow third-party script hosts known from consumer web (not used by dashboard)
  const forbiddenScriptHosts = [
    "sumsub.com",
    "openstreetmap",
    "cartocdn",
    "unsplash",
    "googleapis.com",
    "gstatic.com",
  ];
  for (const host of forbiddenScriptHosts) {
    if (csp.includes(host)) {
      throw new Error(`unexpected third-party host in dashboard CSP: ${host}`);
    }
  }
  if (/script-src[^;]*'unsafe-inline'/.test(csp)) {
    throw new Error("script-src must not include unsafe-inline (use nonces)");
  }
  return true;
}

module.exports = {
  originOf,
  buildDashboardCsp,
  assertDashboardCspInvariants,
};
