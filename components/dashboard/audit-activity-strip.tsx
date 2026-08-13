"use client";

import type { AuditLog } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function AuditActivityStrip({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-nexa-ink">
        Latest events
      </h2>
      <p className="mt-1 text-sm text-nexa-ink-3">
        Last 20 Stays audit-log entries — not a separate activity-feed API.
      </p>
      <ul className="mt-4 divide-y divide-nexa-line rounded-xl border border-nexa-line bg-white">
        {logs.slice(0, 20).map((log) => (
          <li key={log.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-nexa-ink">
                {log.action.replace(/_/g, " ")}
              </p>
              <p className="truncate text-xs text-nexa-ink-4">
                {log.module} · {log.target} · {log.actor}
              </p>
            </div>
            <span className="shrink-0 text-xs text-nexa-ink-4">
              {log.timestamp ? formatDateTime(log.timestamp) : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
