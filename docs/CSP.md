# Dashboard Content Security Policy (SEC-010)

**Status:** IMPLEMENTED in repository. Live response headers on staging/VPS = **NOT VERIFIED**.

## Where applied

- Per-request CSP: `nexastays_dashboard/middleware.ts` (nonce generated each request)
- Static headers (nosniff, XFO, Referrer-Policy, Permissions-Policy, COOP, HSTS): `next.config.js`
- Builder + invariants: `lib/csp.js`
- Tests: `npm run test:csp` → `lib/csp.test.cjs`

## Production policy (shape)

| Directive | Value | Why |
|-----------|--------|-----|
| `default-src` | `'self'` | Baseline |
| `script-src` | `'self' 'nonce-…' 'strict-dynamic'` | No `'unsafe-inline'`; no `'unsafe-eval'` in production |
| `style-src` | `'self' 'unsafe-inline'` | **Accepted residual** — React `style={{…}}` + Tailwind |
| `img-src` | `'self' data: blob:` | Local assets + `URL.createObjectURL` listing/doc previews |
| `media-src` | `'self' blob:` | Walkthrough `<video>` from blob URLs |
| `font-src` | `'self'` | `next/font/google` self-hosts under `/_next/static` |
| `connect-src` | `'self'` + Identity + Stays origins from `NEXT_PUBLIC_*_API_URL` | Only dashboard API clients |
| `frame-src` | `'none'` | No iframes/Sumsub in dashboard |
| `object-src` | `'none'` | |
| `base-uri` | `'self'` | |
| `form-action` | `'self'` | |
| `frame-ancestors` | `'none'` | Reinforces XFO DENY |
| `worker-src` / `manifest-src` | `'self'` | Next defaults |
| `upgrade-insecure-requests` | production only | |

## Explicitly excluded (do not copy from `nexastays_web`)

- Sumsub script/frame hosts
- Map tile / Unsplash CDNs
- Broad `https:` or `*`
- Production `'unsafe-eval'`

## Development relaxations (NODE_ENV ≠ production)

- `'unsafe-eval'` for webpack HMR
- `ws://127.0.0.1:3010` / `ws://localhost:3010` for HMR websockets

## Env requirements

`NEXT_PUBLIC_IDENTITY_API_URL` and `NEXT_PUBLIC_STAYS_API_URL` must be set so `connect-src` includes the correct API origins.
