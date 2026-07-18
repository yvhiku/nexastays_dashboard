"use client";

import Link from "next/link";
import type { OpsOverview } from "@/lib/api/stays-admin";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function OpsHero({
  overview,
  attentionTotal,
}: {
  overview: OpsOverview;
  attentionTotal: number;
}) {
  const { healthScore, snapshot } = overview;
  return (
    <div className="rounded-xl border border-nexa-line bg-gradient-to-br from-white via-nexa-bg to-nexa-primary-soft/40 px-6 py-7">
      <p className="text-sm font-medium text-nexa-ink-3">{greeting()}</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <p className="font-display text-3xl font-semibold tracking-tight text-nexa-ink md:text-4xl">
            Health {healthScore.score}%
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold",
              healthScore.label === "Healthy" && "text-emerald-700",
              healthScore.label === "Watch" && "text-amber-700",
              healthScore.label === "Critical" && "text-nexa-danger",
            )}
          >
            {healthScore.label}
            {attentionTotal > 0
              ? ` · ${attentionTotal} items need review`
              : " · Queues clear"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-nexa-ink-4">
            Revenue today
          </p>
          <p className="mt-0.5 text-2xl font-semibold text-nexa-ink">
            {formatCurrency(snapshot.revenueToday)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-nexa-ink-4">
            Live supply
          </p>
          <p className="mt-0.5 text-2xl font-semibold text-nexa-ink">
            {formatNumber(snapshot.liveListings)}
          </p>
        </div>
      </div>
      {attentionTotal > 0 && (
        <Link
          href="/operations"
          className="mt-5 inline-flex text-sm font-semibold text-nexa-primary hover:underline"
        >
          Open Operations inbox →
        </Link>
      )}
    </div>
  );
}
