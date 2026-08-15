"use client";

import { cn } from "@/lib/utils";
import type { TicketCsat, TicketStatus } from "@/lib/types";

const STAR_PATH =
  "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z";

export function formatCsatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function CsatStars({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div
      className="inline-flex items-center gap-0.5"
      aria-label={`${formatCsatScore(value)} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, value - i));
        return (
          <div key={i} className={cn("relative", dim)}>
            <svg
              viewBox="0 0 24 24"
              className={cn(dim, "fill-nexa-primary-light/70 text-nexa-primary-light")}
              aria-hidden
            >
              <path d={STAR_PATH} />
            </svg>
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <svg
                viewBox="0 0 24 24"
                className={cn(dim, "fill-nexa-primary text-nexa-primary")}
                aria-hidden
              >
                <path d={STAR_PATH} />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function solvedLabel(value: boolean | null | undefined): string {
  if (value == null) return "Not recorded";
  return value ? "Yes" : "No";
}

export function TicketCsatCard({
  status,
  csat,
  reviewAgentName,
  compact = false,
}: {
  status: TicketStatus;
  csat?: TicketCsat | null;
  reviewAgentName?: string | null;
  compact?: boolean;
}) {
  if (!csat && status !== "CLOSED") return null;

  if (!csat) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-nexa-line bg-nexa-bg-2 px-3 py-2 text-sm text-nexa-ink-3",
          compact && "mx-3 mt-2",
        )}
      >
        Waiting for customer review
      </div>
    );
  }

  const agentName = reviewAgentName?.trim() || "support agent";

  return (
    <div
      className={cn(
        "space-y-2 text-sm text-nexa-ink-2",
        compact &&
          "mx-3 mt-2 rounded-md border border-nexa-primary/20 bg-nexa-primary-soft/60 px-3 py-2.5",
      )}
    >
      <p>
        Solved:{" "}
        <span className="font-medium text-nexa-ink">{solvedLabel(csat.problemSolved)}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-nexa-ink-3">Overall</span>
        <CsatStars value={csat.rating} size={compact ? "sm" : "md"} />
        <span className="tabular-nums text-nexa-ink-3">
          {formatCsatScore(csat.rating)}/5
        </span>
      </div>
      {csat.agentRating != null ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-nexa-ink-3">{agentName}</span>
          <CsatStars value={csat.agentRating} size={compact ? "sm" : "md"} />
          <span className="tabular-nums text-nexa-ink-3">
            {formatCsatScore(csat.agentRating)}/5
          </span>
        </div>
      ) : null}
      {csat.comment ? (
        <p
          className={cn(
            "rounded-md bg-nexa-bg-2 px-3 py-2 text-nexa-ink-2",
            compact && "line-clamp-2 bg-white/70",
          )}
        >
          {csat.comment}
        </p>
      ) : null}
      {csat.submittedAt ? (
        <p className="text-[11px] text-nexa-ink-4">
          Submitted {new Date(csat.submittedAt).toLocaleString("en-GB")}
        </p>
      ) : null}
    </div>
  );
}
