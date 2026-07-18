"use client";

import type { OpsOverview } from "@/lib/api/stays-admin";
import { formatNumber } from "@/lib/utils";

const CONVERSION_KEYS = [
  "applicationsToApproved",
  "approvedToDraft",
  "draftToSubmitted",
  "submittedToLive",
  "liveToFirstBooking",
] as const;

export function HostMarketplaceFunnel({ overview }: { overview: OpsOverview }) {
  const { stages, conversions } = overview.funnel;
  const { opsTiming } = overview;

  return (
    <section className="rounded-xl border border-nexa-line bg-white p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-nexa-ink md:text-3xl">
            Host Marketplace Funnel
          </h2>
          <p className="mt-1 text-sm text-nexa-ink-3">
            Month to date (UTC) — where hosts and listings get stuck.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-nexa-ink-4">
              Avg time to approval
            </p>
            <p className="mt-0.5 font-semibold text-nexa-ink">
              {opsTiming.avgHoursToHostApproval != null
                ? `${opsTiming.avgHoursToHostApproval} hours`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-nexa-ink-4">
              Avg draft → submit
            </p>
            <p className="mt-0.5 font-semibold text-nexa-ink">
              {opsTiming.avgDaysDraftToSubmit != null
                ? `${opsTiming.avgDaysDraftToSubmit} days`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center">
        {stages.map((stage, i) => {
          const convKey = CONVERSION_KEYS[i];
          const rate =
            convKey != null
              ? conversions[convKey]
              : null;
          const highlightDraftSubmit =
            stage.key === "draft" || stage.key === "submitted";
          return (
            <div key={stage.key} className="flex w-full max-w-md flex-col items-center">
              <div
                className={`w-full rounded-lg border px-5 py-4 text-center ${
                  highlightDraftSubmit
                    ? "border-nexa-primary/40 bg-nexa-primary-soft/50"
                    : "border-nexa-line bg-nexa-bg"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
                  {stage.label}
                  <span className="ml-1 font-normal normal-case">
                    ({stage.unit})
                  </span>
                </p>
                <p className="mt-1 font-display text-4xl font-semibold text-nexa-ink md:text-5xl">
                  {formatNumber(stage.count)}
                </p>
              </div>
              {i < stages.length - 1 && (
                <div className="flex flex-col items-center py-2">
                  <span className="text-nexa-ink-4">↓</span>
                  <span
                    className={`text-sm font-semibold ${
                      convKey === "draftToSubmitted"
                        ? "text-nexa-primary"
                        : "text-nexa-ink-3"
                    }`}
                  >
                    {rate != null ? `${rate}%` : "—"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
