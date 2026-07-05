# Nexa Stays — Admin Dashboard

The operational control center for the Nexa Stays daily-rentals marketplace (Airbnb-style backend). Built with Next.js 14 (App Router), TypeScript and Tailwind CSS, styled to match the `nexastays.ma` brand (Playfair Display + DM Sans, rose `#E8507A` / warm `#F9A86C` palette).

## Getting started

```bash
npm install
npm run dev
```

The dashboard runs on [http://localhost:3010](http://localhost:3010).

```bash
npm run build   # production build
npm run start   # serve the production build
```

## Modules

| # | Route | Module |
|---|-------|--------|
| 1 | `/` | Overview dashboard — key metrics + live activity feed |
| 2 | `/listings` | Listings management — approve / moderate / suspend |
| 3 | `/users` | Users management — guests, hosts, activity timeline |
| 4 | `/bookings` | Bookings management — control panel + disputes |
| 5 | `/reviews` | Reviews & ratings — moderation + sentiment |
| 6 | `/analytics` | Analytics & growth — GMV, funnel, cities |
| 7 | `/moderation` | Moderation & risk control — flag queue, ban workflows |
| 8 | `/kyc` | KYC / verification — Sumsub status tracking |
| 9 | `/support` | Support / disputes center — tickets |
| 10 | `/settings` | System settings — commission, rules, feature flags |
| 11 | `/roles` | Roles & permissions — RBAC matrix |
| 12 | `/audit-logs` | Audit logs — who / what / when / before-after / IP |

## Architecture notes

- **Data layer:** All screens read from `lib/mock-data.ts`, typed via `lib/types.ts`. This is the single seam to swap for the real Nexa Stays Admin API — replace the exports with data-fetching functions and the UI stays unchanged.
- **Design system:** brand tokens live in `tailwind.config.ts`; shared primitives in `components/ui/*` and charts in `components/charts/charts.tsx` (dependency-free SVG).
- **App shell:** `components/layout/sidebar.tsx` + `topbar.tsx`, wired to `lib/nav.ts`.

Data models mirror the backend Stays service entities (`users`, `listings`, `bookings`, `reviews`, `reports`, `audit_logs`).
