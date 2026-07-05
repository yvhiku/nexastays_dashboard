import {
  CalendarPlus,
  UserPlus,
  Home,
  XCircle,
  RotateCcw,
  BadgeCheck,
  Star,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { RelativeTime } from "@/components/ui/relative-time";
import type { AuditLog } from "@/lib/types";

const config: Record<
  string,
  { icon: LucideIcon; bg: string; color: string }
> = {
  booking: { icon: CalendarPlus, bg: "bg-nexa-primary-soft", color: "text-nexa-primary" },
  host_signup: { icon: UserPlus, bg: "bg-nexa-info-soft", color: "text-nexa-info" },
  listing_submitted: { icon: Home, bg: "bg-nexa-accent-soft", color: "text-[#B45309]" },
  cancellation: { icon: XCircle, bg: "bg-nexa-danger-soft", color: "text-nexa-danger" },
  refund: { icon: RotateCcw, bg: "bg-nexa-warning-soft", color: "text-[#8A5B00]" },
  kyc_approved: { icon: BadgeCheck, bg: "bg-nexa-success-soft", color: "text-nexa-success" },
  review: { icon: Star, bg: "bg-nexa-accent-soft", color: "text-[#B45309]" },
  default: { icon: ScrollText, bg: "bg-nexa-bg-2", color: "text-nexa-ink-3" },
};

function pickStyle(log: AuditLog) {
  const action = log.action.toLowerCase();
  if (action.includes("booking")) return config.booking;
  if (action.includes("host")) return config.host_signup;
  if (action.includes("listing")) return config.listing_submitted;
  if (action.includes("review")) return config.review;
  if (action.includes("cancel")) return config.cancellation;
  return config.default;
}

export function ActivityFeed({ logs = [] }: { logs?: AuditLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-nexa-ink-4">No recent activity.</p>;
  }

  return (
    <ol className="relative space-y-1">
      {logs.map((e) => {
        const c = pickStyle(e);
        const Icon = c.icon;
        return (
          <li key={e.id} className="flex gap-3 rounded-md px-2 py-2.5 hover:bg-nexa-bg-2/60">
            <span
              className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${c.bg}`}
            >
              <Icon className={`h-4 w-4 ${c.color}`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-nexa-ink">{e.action}</p>
              <p className="truncate text-xs text-nexa-ink-3">
                {e.module} · {e.target}
              </p>
            </div>
            <RelativeTime value={e.timestamp} className="shrink-0 text-[11px] text-nexa-ink-4" />
          </li>
        );
      })}
    </ol>
  );
}
