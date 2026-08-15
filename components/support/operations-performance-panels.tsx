"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import {
  supportAgentDisplayName,
  type SupportAgent,
} from "@/lib/api/identity-admin";
import type {
  AgentPerformanceMetrics,
  CategoryPerformanceRow,
  LanguagePerformanceRow,
} from "@/lib/api/stays-admin";
import type { OperationalSignal } from "@/lib/types";
import { signalChip } from "@/components/support/labels";
import {
  categoryLabel,
  csatVsSolvedHint,
  formatPercent,
  formatRating,
  formatWorkload,
  languageLabel,
} from "@/components/support/performance-format";

function agentLabel(agentId: string, roster: SupportAgent[]) {
  const agent = roster.find((row) => row.id === agentId);
  return {
    name: agent ? supportAgentDisplayName(agent) : agentId.slice(0, 8),
    photo: agent?.profilePhotoUrl ?? null,
    email: agent?.email ?? null,
  };
}

export function OperationsAgentsTable({
  rows,
  roster,
  signals,
}: {
  rows: AgentPerformanceMetrics[];
  roster: SupportAgent[];
  signals: OperationalSignal[];
}) {
  if (rows.length === 0) {
    return <EmptyState title="No agent performance in this range" />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-nexa-line text-[11px] uppercase tracking-wide text-nexa-ink-4">
            <th className="py-2 pr-3 font-medium">Agent</th>
            <th className="py-2 pr-3 font-medium">CSAT</th>
            <th className="py-2 pr-3 font-medium">Solved</th>
            <th className="py-2 pr-3 font-medium">FR SLA</th>
            <th className="py-2 pr-3 font-medium">Reopen</th>
            <th className="py-2 pr-3 font-medium">Workload</th>
            <th className="py-2 font-medium">Signals</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const display = agentLabel(row.agentId, roster);
            const chips = signals.filter(
              (signal) =>
                signal.subjectType === "ADMIN" && signal.subjectId === row.agentId,
            );
            return (
              <tr key={row.agentId} className="border-b border-nexa-line last:border-0">
                <td className="py-3 pr-3">
                  <Link
                    href={`/support/operations/agents/${encodeURIComponent(row.agentId)}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    {display.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={display.photo}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <Avatar name={display.name} size="sm" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-nexa-ink">
                        {display.name}
                      </span>
                      <span className="block truncate text-[11px] text-nexa-ink-4">
                        {display.email ?? row.agentId}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="py-3 pr-3 text-nexa-ink">
                  {formatRating(row.averageAgentRating, row.reviewCount)}
                </td>
                <td className="py-3 pr-3 text-nexa-ink">
                  {formatPercent(row.problemSolvedRate)}
                  <span className="text-nexa-ink-4"> · {row.reviewCount}</span>
                </td>
                <td className="py-3 pr-3 text-nexa-ink">
                  {formatPercent(row.firstResponseSlaRate)}
                  <span className="text-nexa-ink-4"> · {row.firstResponseCount}</span>
                </td>
                <td className="py-3 pr-3 text-nexa-ink">
                  {formatPercent(row.reopenRate)}
                  <span className="text-nexa-ink-4"> · {row.ticketsClosed}</span>
                </td>
                <td className="py-3 pr-3 text-nexa-ink">
                  {formatWorkload(row.activeCount, row.workloadCap)}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1">
                    {chips.length === 0 ? (
                      <span className="text-[11px] text-nexa-ink-4">None</span>
                    ) : (
                      chips.map((signal) => (
                        <Badge key={signal.id} variant="neutral">
                          {signalChip(signal.type)}
                        </Badge>
                      ))
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OperationsCategoriesTable({
  rows,
}: {
  rows: CategoryPerformanceRow[];
}) {
  if (rows.length === 0) {
    return <EmptyState title="No category volume in this range" />;
  }
  return (
    <ul className="divide-y divide-nexa-line">
      {rows.map((row) => {
        const hint = csatVsSolvedHint(
          row.averageAgentRating,
          row.problemSolvedRate,
          row.reviewCount,
        );
        return (
          <li key={row.category} className="py-3">
            <p className="text-sm font-medium text-nexa-ink">
              {categoryLabel(row.category)}
            </p>
            <p className="mt-1 text-xs text-nexa-ink-3">
              Volume {row.ticketVolume} · Reviews {row.reviewCount} · Overall{" "}
              {formatRating(row.averageOverallRating, row.reviewCount)} · Agent{" "}
              {formatRating(row.averageAgentRating)} · Solved{" "}
              {formatPercent(row.problemSolvedRate)} · Reopen {row.ticketsReopened}/
              {row.ticketsClosed} · FR SLA {formatPercent(row.firstResponseSlaRate)}
            </p>
            {hint ? <p className="mt-1 text-xs text-nexa-ink">{hint}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function OperationsLanguagesTable({
  rows,
}: {
  rows: LanguagePerformanceRow[];
}) {
  if (rows.length === 0) {
    return <EmptyState title="No language volume in this range" />;
  }
  return (
    <ul className="divide-y divide-nexa-line">
      {rows.map((row) => (
        <li key={row.language} className="py-3">
          <p className="text-sm font-medium text-nexa-ink">
            {languageLabel(row.language)}
          </p>
          <p className="mt-1 text-xs text-nexa-ink-3">
            Volume {row.ticketVolume} · Reviews {row.reviewCount} · Overall{" "}
            {formatRating(row.averageOverallRating, row.reviewCount)} · Solved{" "}
            {formatPercent(row.problemSolvedRate)} · FR SLA{" "}
            {formatPercent(row.firstResponseSlaRate)} · Resolution SLA{" "}
            {formatPercent(row.resolutionSlaRate)}
          </p>
        </li>
      ))}
    </ul>
  );
}
