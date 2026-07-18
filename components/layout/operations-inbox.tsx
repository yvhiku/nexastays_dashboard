"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  fetchOpsOverview,
  EMPTY_OPS_OVERVIEW,
  type OpsOverview,
} from "@/lib/api/stays-admin";
import { useAsyncStats } from "@/lib/hooks/use-async-data";
import { cn, formatWaitAge } from "@/lib/utils";

const REFRESH_MS = 60_000;
const STALE_MS = 24 * 60 * 60 * 1000;

type InboxRow = {
  label: string;
  count: number;
  href: string;
  oldestAt?: string | null;
};

function buildRows(overview: OpsOverview): InboxRow[] {
  const a = overview.attention;
  const rows: InboxRow[] = [
    {
      label: "Listings awaiting review",
      count: a.pendingListings,
      href: "/listings?status=pending",
      oldestAt: a.oldestPendingListingAt,
    },
    {
      label: "Host applications",
      count: a.pendingHostApplications,
      href: "/hosts?status=pending",
      oldestAt: a.oldestPendingHostApplicationAt,
    },
    {
      label: "KYC",
      count: a.pendingKyc ?? 0,
      href: "/kyc?status=pending",
    },
    {
      label: "Needs Changes",
      count: a.needsChangesListings,
      href: "/listings?status=rejected",
    },
  ];
  return rows.filter((r) => r.count > 0);
}

function isStale(oldestAt?: string | null): boolean {
  if (!oldestAt) return false;
  const t = new Date(oldestAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > STALE_MS;
}

export function OperationsInbox() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { data: overview } = useAsyncStats(
    fetchOpsOverview,
    EMPTY_OPS_OVERVIEW,
    [],
    REFRESH_MS,
  );

  const rows = buildRows(overview);
  const total = rows.reduce((s, r) => s + r.count, 0);
  const healthWatch =
    overview.healthScore.label === "Watch" ||
    overview.healthScore.label === "Critical";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative rounded-md p-2 text-nexa-ink-3 hover:bg-nexa-bg-2",
          open && "bg-nexa-bg-2 text-nexa-ink",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Operations inbox"
      >
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-nexa-primary px-1 text-[10px] font-bold leading-none text-white ring-2 ring-nexa-bg">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-nexa-line bg-white shadow-nexa-card"
        >
          <div
            className={cn(
              "border-b border-nexa-line px-4 py-3",
              healthWatch && "bg-amber-50",
            )}
          >
            <p className="text-sm font-semibold text-nexa-ink">Needs Attention</p>
            <p className="mt-0.5 text-xs text-nexa-ink-4">
              {healthWatch
                ? `Health ${overview.healthScore.score}% · ${overview.healthScore.label}`
                : "Open queues that need a decision"}
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-nexa-ink">All clear</p>
              <p className="mt-1 text-xs text-nexa-ink-4">No open queues.</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {rows.map((row) => {
                const oldest = formatWaitAge(row.oldestAt);
                const warn = isStale(row.oldestAt);
                return (
                  <li key={row.href + row.label}>
                    <Link
                      href={row.href}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block px-4 py-3 transition-colors hover:bg-nexa-bg-2",
                        warn && "border-l-2 border-amber-500 bg-amber-50/60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-medium text-nexa-ink">
                          {row.label}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold",
                            warn
                              ? "bg-amber-100 text-amber-900"
                              : "bg-nexa-primary-soft text-nexa-primary-dark",
                          )}
                        >
                          {row.count}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-nexa-ink-4">
                        {row.count} pending
                        {oldest ? ` · Oldest: ${oldest}` : ""}
                        {warn ? " · Over 24h" : ""}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-nexa-line">
            <Link
              href="/operations"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm font-semibold text-nexa-primary hover:bg-nexa-bg-2"
            >
              Open Operations →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
