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
| 1 | `/` | Overview — ops command center |
| 2 | `/operations` | Operations inbox |
| 3 | `/listings` | Listing review queue |
| 4 | `/bookings` | Bookings + financial breakdown |
| 5 | `/hosts` | Host applications |
| 6 | `/guests` | Guest accounts |
| 7 | `/payments` | Payments (read-only) |
| 8 | `/refunds` | Refunds (append-only) |
| 9 | `/support` | Support tickets + booking context |
| 10 | `/kyc` | KYC / verification |
| 11 | `/reports` | Reports & safety |
| 12 | `/reviews` | Reviews moderation |
| 13 | `/audit-logs` | Audit logs |
| 14 | `/admin-users` | Session identity + role catalog |
| 15 | `/analytics` | Strategic metrics |
| 16 | `/settings` | Commission fees |

## Architecture notes

- **Data layer:** Typed API clients in `lib/api/*` talk to Stays (`:3002`) and Identity (`:3001`). Missing endpoints render honest empty / unavailable states — never fabricated marketplace data.
- **Design system:** brand tokens live in `tailwind.config.ts`; shared primitives in `components/ui/*` and charts in `components/charts/charts.tsx` (dependency-free SVG).
- **App shell:** `components/layout/sidebar.tsx` + `topbar.tsx`, wired to `lib/nav.ts`.
- **Spec:** `docs/NEXASTAYS_ADMIN_DASHBOARD.md` (Launch P0).
