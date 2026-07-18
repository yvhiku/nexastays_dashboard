"use client";

import Link from "next/link";
import type { OpsOverview } from "@/lib/api/stays-admin";
import { cn } from "@/lib/utils";

type AttentionItem = {
  label: string;
  count: number;
  href: string;
};

export function NeedsAttention({ overview }: { overview: OpsOverview }) {
  const a = overview.attention;
  const items: AttentionItem[] = [
    {
      label: "Listings awaiting review",
      count: a.pendingListings,
      href: "/listings?status=pending",
    },
    {
      label: "Host applications",
      count: a.pendingHostApplications,
      href: "/hosts?status=pending",
    },
    {
      label: "KYC reviews",
      count: a.pendingKyc ?? 0,
      href: "/kyc?status=pending",
    },
    {
      label: "Listings needing changes",
      count: a.needsChangesListings,
      href: "/listings?status=rejected",
    },
  ];
  if (a.failedPayouts > 0) {
    items.push({
      label: "Failed payouts",
      count: a.failedPayouts,
      href: "/operations",
    });
  }
  if (a.urgentAlerts > 0) {
    items.push({
      label: "Urgent alerts",
      count: a.urgentAlerts,
      href: "/operations",
    });
  }

  const actionable = items.filter((i) => i.count > 0);
  const total = actionable.reduce((s, i) => s + i.count, 0);

  return (
    <section className="rounded-xl border-2 border-nexa-primary/25 bg-white p-5 shadow-nexa-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-nexa-ink">
          Needs Attention
        </h2>
        <span className="rounded-full bg-nexa-primary px-2.5 py-0.5 text-xs font-bold text-white">
          {total}
        </span>
      </div>
      <p className="mt-1 text-sm text-nexa-ink-3">
        Queues that need a decision today.
      </p>
      {actionable.length === 0 ? (
        <p className="mt-6 text-sm text-nexa-ink-4">All clear — no open queues.</p>
      ) : (
        <ul className="mt-4 divide-y divide-nexa-line">
          {actionable.map((item) => (
            <li key={item.href + item.label}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-3 py-3.5 text-sm transition-colors hover:text-nexa-primary",
                )}
              >
                <span className="font-medium text-nexa-ink">{item.label}</span>
                <span className="rounded-md bg-nexa-primary-soft px-2.5 py-1 text-sm font-semibold text-nexa-primary-dark">
                  {item.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
