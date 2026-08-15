"use client";

import type { AgentPerformanceMetrics, PerformanceFreshness } from "@/lib/api/stays-admin";
import {
  formatPercent,
  formatRating,
  formatWorkload,
  freshnessCopy,
} from "@/components/support/performance-format";

export function AgentPerformanceStrip({
  metrics,
  freshness,
}: {
  metrics: AgentPerformanceMetrics;
  freshness?: Pick<PerformanceFreshness, "dataFreshness" | "generatedAt" | "to" | "range">;
}) {
  const rangeLabel =
    freshness?.range === "7d" ? "7 days" : freshness?.range === "90d" ? "90 days" : "30 days";
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-nexa-ink-4">
        Workload {formatWorkload(metrics.activeCount, metrics.workloadCap)} · In
        progress {metrics.inProgress} · Waiting customer {metrics.waitingForCustomer}{" "}
        · Waiting host {metrics.waitingForHost} · Escalated {metrics.escalated}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-nexa-ink">
        <span>
          First-response SLA {formatPercent(metrics.firstResponseSlaRate)}
          <span className="text-nexa-ink-4">
            {" "}
            · {metrics.firstResponseCount} ticket
            {metrics.firstResponseCount === 1 ? "" : "s"}
          </span>
        </span>
        <span>
          Closed {metrics.ticketsClosed}
          <span className="text-nexa-ink-4"> · last {rangeLabel}</span>
        </span>
        <span>
          Problem solved {formatPercent(metrics.problemSolvedRate)} ·{" "}
          {metrics.reviewCount} reviews
        </span>
        <span>Agent {formatRating(metrics.averageAgentRating, metrics.reviewCount)}</span>
      </div>
      {freshness ? (
        <p className="text-[11px] text-nexa-ink-4">{freshnessCopy(freshness)}</p>
      ) : null}
    </div>
  );
}
