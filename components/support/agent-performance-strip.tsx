"use client";

import type { AgentMetrics } from "@/lib/api/stays-admin";

function formatMinutes(seconds: number | null) {
  if (seconds == null) return "—";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function formatRate(rate: number | null) {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

function formatRating(rating: number | null) {
  if (rating == null) return "—";
  return `${rating.toFixed(1)} / 5`;
}

function trendHint(
  delta: number | null | undefined,
  formatter: (value: number) => string,
) {
  if (delta == null) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${formatter(delta)} vs prior period`;
}

export function AgentPerformanceStrip({ metrics }: { metrics: AgentMetrics }) {
  const solvedTrend = trendHint(metrics.trends?.problemSolvedRateDelta, (value) =>
    `${Math.round(value * 100)} pts`,
  );
  const responseTrend = trendHint(
    metrics.trends?.averageFirstResponseSecondsDelta,
    (value) => `${Math.round(value / 60)} min`,
  );

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-nexa-ink-4">
        In progress {metrics.inProgress} · Waiting customer {metrics.waitingForCustomer}{" "}
        · Waiting host {metrics.waitingForHost} · Escalated {metrics.escalated}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-nexa-ink">
        <span>
          Closed {metrics.closedCount}
          <span className="text-nexa-ink-4"> · last 30 days</span>
        </span>
        <span>
          Avg first response {formatMinutes(metrics.averageFirstResponseSeconds)}
          {responseTrend ? (
            <span className="text-nexa-ink-4"> · {responseTrend}</span>
          ) : null}
        </span>
        <span>
          Problem solved {formatRate(metrics.problemSolvedRate)} · {metrics.reviewCount}{" "}
          reviews
          {solvedTrend ? (
            <span className="text-nexa-ink-4"> · {solvedTrend}</span>
          ) : null}
        </span>
        <span>
          Agent {formatRating(metrics.averageAgentRating)} · {metrics.reviewCount} reviews
        </span>
      </div>
    </div>
  );
}
