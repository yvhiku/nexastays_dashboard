"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { fetchAuditLogs } from "@/lib/api/stays-admin";
import { fetchIdentityAuditLogs } from "@/lib/api/users-admin";
import { formatDateTime } from "@/lib/utils";
import { formatAuditAction, isAbortError } from "./person-display";

export function PersonActivity({ userId }: { userId: string }) {
  const [identityItems, setIdentityItems] = useState<
    Array<{ action: string; createdAt: string }>
  >([]);
  const [staysItems, setStaysItems] = useState<
    Array<{ action: string; createdAt: string; module: string }>
  >([]);
  const [identityLoading, setIdentityLoading] = useState(true);
  const [staysLoading, setStaysLoading] = useState(true);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [staysError, setStaysError] = useState<string | null>(null);
  const [identityRetry, setIdentityRetry] = useState(0);
  const [staysRetry, setStaysRetry] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    setIdentityItems([]);
    setIdentityError(null);
    setIdentityLoading(true);

    fetchIdentityAuditLogs(userId, { signal: ac.signal })
      .then((rows) => {
        if (ac.signal.aborted) return;
        setIdentityItems(rows);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) return;
        setIdentityError(err instanceof Error ? err.message : "Failed to load Identity audit");
      })
      .finally(() => {
        if (!ac.signal.aborted) setIdentityLoading(false);
      });

    return () => ac.abort();
  }, [userId, identityRetry]);

  useEffect(() => {
    const ac = new AbortController();
    setStaysItems([]);
    setStaysError(null);
    setStaysLoading(true);

    fetchAuditLogs({ actorUserId: userId, limit: 20, signal: ac.signal })
      .then((rows) => {
        if (ac.signal.aborted) return;
        setStaysItems(
          rows.map((row) => ({
            action: row.action,
            createdAt: row.timestamp,
            module: row.module,
          })),
        );
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted || isAbortError(err)) return;
        setStaysError(err instanceof Error ? err.message : "Failed to load Stays audit");
      })
      .finally(() => {
        if (!ac.signal.aborted) setStaysLoading(false);
      });

    return () => ac.abort();
  }, [userId, staysRetry]);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
          Identity audit
        </h3>
        <p className="mt-1 text-xs text-nexa-ink-4">
          Latest 20 events from Identity. Separate from Stays audit.
        </p>
        {identityLoading ? (
          <LoadingState className="py-6" label="Loading Identity audit…" />
        ) : identityError ? (
          <ErrorState
            className="mt-3"
            title="Couldn't load Identity audit"
            detail={identityError}
            onRetry={() => setIdentityRetry((n) => n + 1)}
          />
        ) : identityItems.length === 0 ? (
          <EmptyState className="py-6" title="No Identity audit events" />
        ) : (
          <ul className="mt-3 space-y-2">
            {identityItems.map((item, index) => (
              <li
                key={`${item.action}-${item.createdAt}-${index}`}
                className="rounded-md border border-nexa-line px-3 py-2 text-sm"
              >
                <p className="text-nexa-ink">{formatAuditAction(item.action)}</p>
                <p className="mt-0.5 text-xs text-nexa-ink-4">
                  {item.createdAt ? formatDateTime(item.createdAt) : "Not collected"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
          Stays audit
        </h3>
        <p className="mt-1 text-xs text-nexa-ink-4">
          Latest 20 actor events from Stays. Not the same filter as Identity.
        </p>
        {staysLoading ? (
          <LoadingState className="py-6" label="Loading Stays audit…" />
        ) : staysError ? (
          <ErrorState
            className="mt-3"
            title="Couldn't load Stays audit"
            detail={staysError}
            onRetry={() => setStaysRetry((n) => n + 1)}
          />
        ) : staysItems.length === 0 ? (
          <EmptyState className="py-6" title="No Stays audit events" />
        ) : (
          <ul className="mt-3 space-y-2">
            {staysItems.map((item, index) => (
              <li
                key={`${item.action}-${item.createdAt}-${index}`}
                className="rounded-md border border-nexa-line px-3 py-2 text-sm"
              >
                <p className="text-nexa-ink">{formatAuditAction(item.action)}</p>
                <p className="mt-0.5 text-xs text-nexa-ink-4">
                  {item.module} · {item.createdAt ? formatDateTime(item.createdAt) : "Not collected"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
