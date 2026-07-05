"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Globe } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { SearchInput, FilterTabs } from "@/components/ui/toolbar";
import { Avatar } from "@/components/ui/avatar";
import { fetchAuditLogs } from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { formatDateTime } from "@/lib/utils";

const MODULES = ["all", "Listings", "Users", "Bookings", "Reviews", "Settings", "Support", "KYC"];

export default function AuditLogsPage() {
  const [module, setModule] = useState("all");
  const [query, setQuery] = useState("");
  const { data: auditLogs, loading, error } = useAsyncList(fetchAuditLogs, []);

  const filtered = useMemo(
    () =>
      auditLogs.filter((l) => {
        const matchModule = module === "all" || l.module === module;
        const matchQuery =
          l.actor.toLowerCase().includes(query.toLowerCase()) ||
          l.action.toLowerCase().includes(query.toLowerCase()) ||
          l.target.toLowerCase().includes(query.toLowerCase());
        return matchModule && matchQuery;
      }),
    [auditLogs, module, query],
  );

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Administrative actions recorded in the Stays audit log."
        actions={<Button variant="outline" size="sm">Export logs</Button>}
      />

      {error && (
        <p className="mb-4 text-sm text-nexa-danger">Failed to load audit logs: {error}</p>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs
          value={module}
          onChange={setModule}
          options={MODULES.map((m) => ({ value: m, label: m === "all" ? "All modules" : m }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search actor, action, target…" className="lg:w-72" />
      </div>

      <Card>
        {loading ? (
          <p className="py-10 text-center text-sm text-nexa-ink-4">Loading audit logs…</p>
        ) : (
        <Table>
          <THead>
            <tr>
              <TH>Actor</TH>
              <TH>Action</TH>
              <TH>Module</TH>
              <TH>Target</TH>
              <TH>Change</TH>
              <TH>IP address</TH>
              <TH>Timestamp</TH>
            </tr>
          </THead>
          <tbody>
            {filtered.map((l) => (
              <TR key={l.id}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={l.actor.replace(/[()]/g, "")} size="sm" />
                    <div>
                      <p className="font-medium text-nexa-ink">{l.actor}</p>
                      <p className="text-xs text-nexa-ink-4">{l.actorRole}</p>
                    </div>
                  </div>
                </TD>
                <TD className="text-nexa-ink-2">{l.action}</TD>
                <TD>
                  <Badge variant="neutral">{l.module}</Badge>
                </TD>
                <TD className="font-mono text-xs text-nexa-ink-3">{l.target}</TD>
                <TD>
                  {l.before && l.after ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className="rounded bg-nexa-danger-soft px-1.5 py-0.5 text-nexa-danger">
                        {l.before}
                      </span>
                      <ArrowRight className="h-3 w-3 text-nexa-ink-4" />
                      <span className="rounded bg-nexa-success-soft px-1.5 py-0.5 text-nexa-success">
                        {l.after}
                      </span>
                    </span>
                  ) : (
                    <span className="text-nexa-ink-4">—</span>
                  )}
                </TD>
                <TD>
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-nexa-ink-3">
                    <Globe className="h-3 w-3" /> {l.ip}
                  </span>
                </TD>
                <TD className="whitespace-nowrap text-xs text-nexa-ink-3">
                  {formatDateTime(l.timestamp)}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
        )}
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-nexa-ink-4">No matching log entries.</p>
        )}
      </Card>
    </div>
  );
}
