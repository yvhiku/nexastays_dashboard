"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Gauge, LifeBuoy, ShieldAlert, UserX } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { fetchSupportOperationsOverview } from "@/lib/api/stays-admin";
import type { SupportOperationsOverview } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const EMPTY: SupportOperationsOverview = {
  activeTickets: 0,
  unassignedTickets: 0,
  highPriorityUnassigned: 0,
  urgentTickets: 0,
  slaAtRisk: 0,
  slaBreached: 0,
  activeSignals: 0,
  acknowledgedSignals: 0,
  agentWorkload: [],
};

export default function SupportOperationsPage() {
  const [data, setData] = useState<SupportOperationsOverview>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchSupportOperationsOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operations");
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Support operations"
        description="Current-state workload, SLA pressure, and active operational signals. Advisory only."
        actions={
          <Button size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error && (
        <ErrorState title="Failed to load operations" detail={error} onRetry={() => void load()} />
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Active tickets"
          value={loading ? "…" : formatNumber(data.activeTickets)}
          icon={LifeBuoy}
        />
        <MetricCard
          label="Unassigned"
          value={loading ? "…" : formatNumber(data.unassignedTickets)}
          icon={UserX}
        />
        <MetricCard
          label="High-priority unassigned"
          value={loading ? "…" : formatNumber(data.highPriorityUnassigned)}
          icon={ShieldAlert}
          accent="accent"
        />
        <MetricCard
          label="SLA at risk"
          value={loading ? "…" : formatNumber(data.slaAtRisk)}
          icon={Clock}
        />
        <MetricCard
          label="SLA breached"
          value={loading ? "…" : formatNumber(data.slaBreached)}
          icon={ShieldAlert}
          accent="accent"
        />
        <MetricCard
          label="Active signals"
          value={loading ? "…" : formatNumber(data.activeSignals)}
          icon={Gauge}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Agent workload</CardTitle>
        </CardHeader>
        <CardContent>
          {data.agentWorkload.length === 0 ? (
            <p className="text-sm text-nexa-ink-4">No assigned open tickets.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Admin</TH>
                  <TH>Open</TH>
                  <TH>High priority</TH>
                  <TH>Waiting</TH>
                </tr>
              </THead>
              <tbody>
                {data.agentWorkload.map((row) => (
                  <TR key={row.adminId}>
                    <TD className="font-mono text-xs">{row.adminId}</TD>
                    <TD>{row.openTickets}</TD>
                    <TD>{row.highPriorityTickets}</TD>
                    <TD>{row.waitingTickets}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
