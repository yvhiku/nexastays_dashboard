"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Gauge,
  LifeBuoy,
  ShieldAlert,
  UserX,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import { useAuth } from "@/components/providers/auth-provider";
import { getSupportWorkspaceConfig } from "@/lib/support-workspace";
import {
  fetchSupportAgents,
  supportAgentDisplayName,
} from "@/lib/api/identity-admin";
import {
  fetchSupportAgentWorkload,
  fetchSupportAttention,
  fetchSupportOperationsOverview,
  fetchSupportSignals,
  joinSupportAgentsWithWorkload,
  patchOperationalSignal,
  reopenTicket,
  fetchSupportAgentMetrics,
  type AgentMetrics,
  type SupportAgentWithWorkload,
} from "@/lib/api/stays-admin";
import { CannedRepliesManager } from "@/components/support/canned-replies-manager";
import type {
  OperationalSignal,
  SupportAttentionItem,
  SupportOperationsOverview,
} from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import {
  SUPPORT_REOPEN_REASONS,
  reopenReasonLabel,
  signalChip,
} from "@/components/support/labels";

const EMPTY_OVERVIEW: SupportOperationsOverview = {
  activeTickets: 0,
  openTickets: 0,
  inProgressTickets: 0,
  waitingTickets: 0,
  escalatedTickets: 0,
  unassignedTickets: 0,
  highPriorityTickets: 0,
  highPriorityUnassigned: 0,
  urgentTickets: 0,
  slaOnTrack: 0,
  slaAtRisk: 0,
  slaBreached: 0,
  activeSignals: 0,
  acknowledgedSignals: 0,
  agentWorkload: [],
};

function reasonLabel(reason: string) {
  if (reason === "SLA_BREACHED") return "SLA breached";
  if (reason === "SLA_AT_RISK") return "SLA at risk";
  if (reason === "HIGH_PRIORITY") return "High priority";
  if (reason === "URGENT") return "Urgent";
  if (reason === "UNASSIGNED") return "Unassigned";
  if (reason === "ACTIVE_SIGNAL") return "Active signal";
  if (reason === "FOLLOW_UP_REQUIRED") return "Customer says issue was not solved";
  return reason.replace(/_/g, " ");
}

type Section<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

function useSection<T>(initial: T): [Section<T>, (loader: () => Promise<T>) => Promise<void>] {
  const [state, setState] = useState<Section<T>>({
    data: initial,
    loading: true,
    error: null,
  });
  const run = useCallback(async (loader: () => Promise<T>) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loader();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load",
      }));
    }
  }, []);
  return [state, run];
}

export default function SupportOperationsPage() {
  const router = useRouter();
  const { session } = useAuth();
  const workspaceConfig = useMemo(
    () => getSupportWorkspaceConfig(session),
    [session],
  );
  const [overview, loadOverview] = useSection(EMPTY_OVERVIEW);
  const [attention, loadAttention] = useSection<{
    items: SupportAttentionItem[];
    total: number;
  }>({ items: [], total: 0 });
  const [agents, loadAgents] = useSection<SupportAgentWithWorkload[]>([]);
  const [signals, loadSignals] = useSection<{
    items: OperationalSignal[];
    total: number;
  }>({ items: [], total: 0 });
  const [attentionBusy, setAttentionBusy] = useState<string | null>(null);
  const [metricsById, setMetricsById] = useState<Map<string, AgentMetrics>>(
    () => new Map(),
  );
  const [reopenReasons, setReopenReasons] = useState<Record<string, string>>({});

  const refresh = useCallback(() => {
    if (!workspaceConfig.canViewOperations) return;
    void loadOverview(fetchSupportOperationsOverview);
    void loadAttention(() =>
      fetchSupportAttention({ limit: 20 }).then((page) => ({
        items: page.items,
        total: page.total,
      })),
    );
    void loadAgents(async () => {
      const [roster, workload, metrics] = await Promise.all([
        fetchSupportAgents(),
        fetchSupportAgentWorkload(),
        fetchSupportAgentMetrics().catch(() => [] as AgentMetrics[]),
      ]);
      setMetricsById(new Map(metrics.map((row) => [row.agentId, row])));
      return joinSupportAgentsWithWorkload(roster, workload);
    });
    void loadSignals(() => fetchSupportSignals({ limit: 50 }));
  }, [
    workspaceConfig.canViewOperations,
    loadOverview,
    loadAttention,
    loadAgents,
    loadSignals,
  ]);

  useEffect(() => {
    if (!workspaceConfig.canViewOperations) {
      router.replace("/support");
      return;
    }
    refresh();
  }, [workspaceConfig.canViewOperations, refresh, router]);

  if (!workspaceConfig.canViewOperations) {
    return <LoadingState label="Redirecting…" />;
  }

  const agentName = (id: string | null) => {
    if (!id) return "Unassigned";
    const agent = agents.data.find((row) => row.id === id);
    return agent ? supportAgentDisplayName(agent) : "Unavailable agent";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Support operations"
        description="Current-state queue health, attention, workload, and advisory signals. New tickets auto-assign to the least-loaded eligible agent; unassigned means no eligible capacity."
        actions={
          <Button size="sm" onClick={refresh}>
            Refresh
          </Button>
        }
      />

      {workspaceConfig.canViewQueueHealth && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold text-nexa-ink">
            Queue health
          </h2>
          {overview.error ? (
            <ErrorState
              title="Failed to load queue health"
              detail={overview.error}
              onRetry={() => void loadOverview(fetchSupportOperationsOverview)}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <MetricCard
                label="Active tickets"
                value={overview.loading ? "…" : formatNumber(overview.data.activeTickets)}
                icon={LifeBuoy}
              />
              <MetricCard
                label="Unassigned"
                value={overview.loading ? "…" : formatNumber(overview.data.unassignedTickets)}
                icon={UserX}
              />
              <MetricCard
                label="Open"
                value={overview.loading ? "…" : formatNumber(overview.data.openTickets)}
                icon={LifeBuoy}
              />
              <MetricCard
                label="In progress"
                value={overview.loading ? "…" : formatNumber(overview.data.inProgressTickets)}
                icon={Clock}
              />
              <MetricCard
                label="Waiting"
                value={overview.loading ? "…" : formatNumber(overview.data.waitingTickets)}
                icon={Clock}
              />
              <MetricCard
                label="Escalated"
                value={overview.loading ? "…" : formatNumber(overview.data.escalatedTickets)}
                icon={ShieldAlert}
              />
              <MetricCard
                label="Urgent"
                value={overview.loading ? "…" : formatNumber(overview.data.urgentTickets)}
                icon={ShieldAlert}
                accent="accent"
              />
              <MetricCard
                label="High-priority unassigned"
                value={
                  overview.loading
                    ? "…"
                    : formatNumber(overview.data.highPriorityUnassigned)
                }
                icon={ShieldAlert}
                accent="accent"
              />
              <MetricCard
                label="SLA at risk"
                value={overview.loading ? "…" : formatNumber(overview.data.slaAtRisk)}
                icon={Clock}
              />
              <MetricCard
                label="SLA breached"
                value={overview.loading ? "…" : formatNumber(overview.data.slaBreached)}
                icon={ShieldAlert}
                accent="accent"
              />
              <MetricCard
                label="On track"
                value={overview.loading ? "…" : formatNumber(overview.data.slaOnTrack)}
                icon={Gauge}
              />
              <MetricCard
                label="Active signals"
                value={overview.loading ? "…" : formatNumber(overview.data.activeSignals)}
                icon={Gauge}
              />
            </div>
          )}
        </section>
      )}

      {workspaceConfig.canViewAttentionQueue && (
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
          </CardHeader>
          <CardContent>
            {attention.error ? (
              <ErrorState
                title="Failed to load attention queue"
                detail={attention.error}
                onRetry={() =>
                  void loadAttention(() =>
                    fetchSupportAttention({ limit: 20 }).then((page) => ({
                      items: page.items,
                      total: page.total,
                    })),
                  )
                }
              />
            ) : attention.loading && attention.data.items.length === 0 ? (
              <LoadingState label="Loading attention queue…" />
            ) : attention.data.items.length === 0 ? (
              <EmptyState title="No tickets need immediate attention" />
            ) : (
              <ul className="divide-y divide-nexa-line">
                {attention.data.items.map((item) => (
                  <li key={item.ticketId} className="py-3">
                    <div className="rounded-md hover:bg-nexa-bg-2">
                      <Link
                        href={`/support?ticket=${encodeURIComponent(item.ticketId)}`}
                        className="block"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-nexa-ink">
                              {item.ticketNumber} · {item.subject}
                            </p>
                            <p className="mt-0.5 text-xs text-nexa-ink-4">
                              {item.status.replace(/_/g, " ")} · {item.priority} ·{" "}
                              {agentName(item.assignedAdminId)}
                            </p>
                            {item.attentionReasons.includes("FOLLOW_UP_REQUIRED") && (
                              <p className="mt-1 text-xs text-nexa-ink">
                                Customer says issue was not solved
                                {item.overallRating != null
                                  ? ` · Overall rating: ${item.overallRating}/5`
                                  : ""}
                                {item.agentRating != null
                                  ? ` · Agent rating: ${item.agentRating}/5`
                                  : ""}
                              </p>
                            )}
                          </div>
                          <RelativeTime
                            value={item.createdAt}
                            className="text-[11px] text-nexa-ink-4"
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.attentionReasons.map((reason) => (
                            <Badge key={reason} variant="neutral">
                              {reasonLabel(reason)}
                            </Badge>
                          ))}
                        </div>
                      </Link>
                      {item.attentionReasons.includes("FOLLOW_UP_REQUIRED") && (
                        <div className="mt-2 flex flex-wrap gap-2 px-0 pb-1">
                          <select
                            className="h-8 rounded-md border border-nexa-line bg-white px-2 text-xs"
                            aria-label="Reopen reason"
                            value={
                              reopenReasons[item.ticketId] ?? "CUSTOMER_UNRESOLVED"
                            }
                            onChange={(e) =>
                              setReopenReasons((prev) => ({
                                ...prev,
                                [item.ticketId]: e.target.value,
                              }))
                            }
                          >
                            {SUPPORT_REOPEN_REASONS.map((reason) => (
                              <option key={reason} value={reason}>
                                {reopenReasonLabel(reason)}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={attentionBusy === item.ticketId}
                            onClick={() => {
                              setAttentionBusy(item.ticketId);
                              void reopenTicket(
                                item.ticketId,
                                reopenReasons[item.ticketId] ??
                                  "CUSTOMER_UNRESOLVED",
                              )
                                .then(() => {
                                  router.push(
                                    `/support?ticket=${encodeURIComponent(item.ticketId)}`,
                                  );
                                  refresh();
                                })
                                .finally(() => setAttentionBusy(null));
                            }}
                          >
                            Reopen
                          </Button>
                          {item.followUpSignalId && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={attentionBusy === item.ticketId}
                              onClick={() => {
                                const signalId = item.followUpSignalId;
                                if (!signalId) return;
                                setAttentionBusy(item.ticketId);
                                void patchOperationalSignal(signalId, "RESOLVED")
                                  .then(() => refresh())
                                  .finally(() => setAttentionBusy(null));
                              }}
                            >
                              Mark reviewed
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {workspaceConfig.canViewAgentMonitoring && (
        <Card>
          <CardHeader>
            <CardTitle>Agent workload</CardTitle>
          </CardHeader>
          <CardContent>
            {agents.error ? (
              <ErrorState
                title="Failed to load agent workload"
                detail={agents.error}
                onRetry={() =>
                  void loadAgents(async () => {
                    const [roster, workload] = await Promise.all([
                      fetchSupportAgents(),
                      fetchSupportAgentWorkload(),
                    ]);
                    return joinSupportAgentsWithWorkload(roster, workload);
                  })
                }
              />
            ) : agents.loading && agents.data.length === 0 ? (
              <LoadingState label="Loading agents…" />
            ) : agents.data.length === 0 ? (
              <EmptyState title="No support agents" />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {agents.data.map((agent) => {
                  const name = supportAgentDisplayName(agent);
                  return (
                    <Link
                      key={agent.id}
                      href={`/support?assignedAdminId=${encodeURIComponent(agent.id)}`}
                      className="rounded-md border border-nexa-line p-3 hover:bg-nexa-bg-2"
                    >
                      <div className="flex items-center gap-3">
                        {agent.profilePhotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={agent.profilePhotoUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <Avatar name={name} size="sm" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-nexa-ink">{name}</p>
                          <p className="truncate text-xs text-nexa-ink-4">
                            {agent.email ?? agent.id} · {agent.status}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                        {[
                          ["Assigned", agent.assigned],
                          ["In progress", agent.inProgress],
                          ["Wait customer", agent.waitingForCustomer],
                          ["Wait host", agent.waitingForHost],
                        ].map(([label, value]) => (
                          <div key={String(label)}>
                            <p className="text-sm font-semibold text-nexa-ink">{value}</p>
                            <p className="text-[10px] text-nexa-ink-4">{label}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-nexa-ink-4">
                        Escalated {agent.escalated} · At risk {agent.atRisk} · Breached{" "}
                        {agent.breached}
                        {agent.oldestActiveTicketAt
                          ? ` · Oldest ${new Date(agent.oldestActiveTicketAt).toLocaleDateString("en-GB")}`
                          : ""}
                        {` · Avg rating ${
                          agent.averageAgentRating != null
                            ? agent.averageAgentRating.toFixed(1)
                            : "—"
                        } · ${agent.reviewCount} review${agent.reviewCount === 1 ? "" : "s"}`}
                        {(() => {
                          const metrics = metricsById.get(agent.id);
                          if (!metrics) return "";
                          const solved =
                            metrics.problemSolvedRate != null
                              ? `${Math.round(metrics.problemSolvedRate * 100)}%`
                              : "—";
                          const rating =
                            metrics.averageAgentRating != null
                              ? `${metrics.averageAgentRating.toFixed(1)} / 5`
                              : "—";
                          const response =
                            metrics.averageFirstResponseSeconds != null
                              ? `${Math.round(metrics.averageFirstResponseSeconds / 60)} min`
                              : "—";
                          return ` · Last 30d closed ${metrics.closedCount} · Reopened ${metrics.reopenedCount} · Solved ${solved} · Agent ${rating} · ${metrics.reviewCount} reviews · Avg first response ${response}`;
                        })()}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {workspaceConfig.canViewGlobalSignals && (
        <Card>
          <CardHeader>
            <CardTitle>
              Operational signals
              {!signals.loading ? ` · ${signals.data.total}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signals.error ? (
              <ErrorState
                title="Failed to load signals"
                detail={signals.error}
                onRetry={() => void loadSignals(() => fetchSupportSignals({ limit: 50 }))}
              />
            ) : signals.loading && signals.data.items.length === 0 ? (
              <LoadingState label="Loading signals…" />
            ) : signals.data.items.length === 0 ? (
              <EmptyState title="No active operational signals" />
            ) : (
              <ul className="space-y-2">
                {signals.data.items.map((signal) => (
                  <li
                    key={signal.id}
                    className="rounded-md border border-nexa-line bg-nexa-bg-2 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-nexa-ink">
                      {signal.severity} · {signalChip(signal.type)} · {signal.status}
                    </p>
                    <p className="mt-1 text-xs text-nexa-ink-3">
                      {signal.reason.explanation}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {signal.ticketId ? (
                        <Link
                          href={`/support?ticket=${encodeURIComponent(signal.ticketId)}`}
                          className="text-xs font-medium text-nexa-primary"
                        >
                          Open ticket
                        </Link>
                      ) : null}
                      {signal.status === "ACTIVE" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void patchOperationalSignal(signal.id, "ACKNOWLEDGED").then(() => {
                              void loadSignals(() => fetchSupportSignals({ limit: 50 }));
                            });
                          }}
                        >
                          Acknowledge
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Canned replies</CardTitle>
        </CardHeader>
        <CardContent>
          <CannedRepliesManager />
        </CardContent>
      </Card>
    </div>
  );
}
