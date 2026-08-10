/**
 * SEC-010 CSP unit tests (Node built-in test runner).
 * Run: npm run test:csp
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildDashboardCsp,
  assertDashboardCspInvariants,
  originOf,
} = require("./csp.js");

test("originOf extracts scheme+host+port", () => {
  assert.equal(
    originOf("http://127.0.0.1:3002/api/v1"),
    "http://127.0.0.1:3002",
  );
  assert.equal(
    originOf("https://stays.example/api/v1"),
    "https://stays.example",
  );
  assert.equal(originOf("not-a-url"), undefined);
});

test("production CSP: core directives and no unsafe-eval", () => {
  const csp = buildDashboardCsp({
    isDev: false,
    identityApiUrl: "https://identity.example/api/v1",
    staysApiUrl: "https://stays.example/api/v1",
    nonce: "testNonceValue",
  });
  assertDashboardCspInvariants(csp, { allowUnsafeEval: false });
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /frame-src 'none'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /script-src[^;]*'nonce-testNonceValue'/);
  assert.match(csp, /script-src[^;]*'strict-dynamic'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
  assert.match(csp, /style-src[^;]*'unsafe-inline'/);
  assert.match(csp, /connect-src[^;]*https:\/\/identity\.example/);
  assert.match(csp, /connect-src[^;]*https:\/\/stays\.example/);
  assert.match(csp, /img-src[^;]*blob:/);
  assert.match(csp, /media-src[^;]*blob:/);
  assert.match(csp, /upgrade-insecure-requests/);
});

test("production CSP rejects consumer-web third parties", () => {
  const csp = buildDashboardCsp({
    isDev: false,
    identityApiUrl: "https://identity.example/api/v1",
    staysApiUrl: "https://stays.example/api/v1",
    nonce: "abc",
  });
  assert.doesNotMatch(csp, /sumsub/i);
  assert.doesNotMatch(csp, /openstreetmap/i);
  assert.doesNotMatch(csp, /unsplash/i);
  assert.doesNotMatch(csp, /googleapis/i);
});

test("dev CSP may include unsafe-eval and ws loopback", () => {
  const csp = buildDashboardCsp({
    isDev: true,
    identityApiUrl: "http://127.0.0.1:3001/api/v1",
    staysApiUrl: "http://127.0.0.1:3002/api/v1",
    nonce: "devNonce",
  });
  assertDashboardCspInvariants(csp, { allowUnsafeEval: true });
  assert.match(csp, /unsafe-eval/);
  assert.match(csp, /ws:\/\/127\.0\.0\.1:3010/);
  assert.doesNotMatch(csp, /upgrade-insecure-requests/);
});

test("connect-src only includes configured API origins", () => {
  const csp = buildDashboardCsp({
    isDev: false,
    identityApiUrl: "https://id.nexastays.test/api/v1",
    staysApiUrl: "https://api.nexastays.test/api/v1",
    nonce: "n",
  });
  const connect = csp.split(";").find((d) => d.trim().startsWith("connect-src"));
  assert.ok(connect);
  assert.match(connect, /https:\/\/id\.nexastays\.test/);
  assert.match(connect, /https:\/\/api\.nexastays\.test/);
  assert.doesNotMatch(connect, /https:\/\/evil/);
  assert.doesNotMatch(connect, /\*/);
});

test("assertDashboardCspInvariants rejects wildcards", () => {
  assert.throws(() =>
    assertDashboardCspInvariants(
      "default-src 'self'; script-src *; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
    ),
  );
});

test("assertDashboardCspInvariants rejects script unsafe-inline", () => {
  assert.throws(() =>
    assertDashboardCspInvariants(
      "default-src 'self'; script-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
    ),
  );
});
