"use client";

import type { OpsOverview } from "@/lib/api/stays-admin";
import { formatNumber } from "@/lib/utils";

export function GroupedActivity({ overview }: { overview: OpsOverview }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-nexa-ink">
        Recent Activity
      </h2>
      <p className="mt-1 text-sm text-nexa-ink-3">Grouped by day for faster scanning.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {overview.activityGrouped.map((day) => {
          const rows = [
            { label: "Listings approved", value: day.listingsApproved },
            { label: "Hosts approved", value: day.hostsApproved },
            { label: "Bookings", value: day.bookings },
            { label: "Reviews", value: day.reviews },
            { label: "Cancellations", value: day.cancellations },
          ].filter((r) => r.value > 0);

          return (
            <div
              key={day.key}
              className="rounded-xl border border-nexa-line bg-white p-5"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-nexa-ink-4">
                {day.label}
              </h3>
              {rows.length === 0 ? (
                <p className="mt-3 text-sm text-nexa-ink-4">No notable activity.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {rows.map((r) => (
                    <li
                      key={r.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-nexa-ink-2">{r.label}</span>
                      <span className="font-semibold text-nexa-ink">
                        {formatNumber(r.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
