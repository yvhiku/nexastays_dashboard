"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { FilterTabs } from "@/components/ui/toolbar";
import { RelativeTime } from "@/components/ui/relative-time";
import { useAuth } from "@/components/providers/auth-provider";
import { getSupportWorkspaceConfig } from "@/lib/support-workspace";
import {
  fetchSupportAgents,
  supportAgentDisplayName,
  type SupportAgent,
} from "@/lib/api/identity-admin";
import {
  fetchAgentPerformance,
  fetchCoachingNotes,
  createCoachingNote,
  patchCoachingNote,
  type AgentPerformanceDetail,
  type CoachingNote,
  type SupportPerformanceRange,
} from "@/lib/api/stays-admin";
import { AgentPerformanceStrip } from "@/components/support/agent-performance-strip";
import { OperationsCategoriesTable } from "@/components/support/operations-performance-panels";
import {
  categoryLabel,
  formatPercent,
  formatRating,
  freshnessCopy,
} from "@/components/support/performance-format";
import { signalChip } from "@/components/support/labels";

export default function SupportAgentPerformancePage() {
  const params = useParams<{ id: string }>();
  const agentId = String(params?.id ?? "");
  const router = useRouter();
  const { session } = useAuth();
  const workspaceConfig = useMemo(
    () => getSupportWorkspaceConfig(session),
    [session],
  );
  const [range, setRange] = useState<SupportPerformanceRange>("30d");
  const [roster, setRoster] = useState<SupportAgent[]>([]);
  const [detail, setDetail] = useState<AgentPerformanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<CoachingNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  const refreshNotes = useCallback(async () => {
    if (!agentId) return;
    const items = await fetchCoachingNotes(agentId);
    setNotes(items);
  }, [agentId]);

  const refreshPerformance = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchAgentPerformance(agentId, range);
      setDetail(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load performance");
    } finally {
      setLoading(false);
    }
  }, [agentId, range]);

  useEffect(() => {
    if (!workspaceConfig.canViewOperations) {
      router.replace("/support");
    }
  }, [workspaceConfig.canViewOperations, router]);

  useEffect(() => {
    void fetchSupportAgents()
      .then(setRoster)
      .catch(() => setRoster([]));
  }, []);

  useEffect(() => {
    void refreshPerformance();
  }, [refreshPerformance]);

  useEffect(() => {
    void refreshNotes().catch(() => setNotes([]));
  }, [refreshNotes]);

  if (!workspaceConfig.canViewOperations) {
    return <LoadingState label="Redirecting…" />;
  }

  const agent = roster.find((row) => row.id === agentId);
  const name = agent ? supportAgentDisplayName(agent) : agentId.slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        description="Agent performance, category mix, recent feedback, and coaching notes. Metrics are not a ranking."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/support/operations" className="text-sm text-nexa-primary">
              Back to operations
            </Link>
            <Button size="sm" onClick={() => void refreshPerformance()}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3">
        {agent?.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.profilePhotoUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <Avatar name={name} size="sm" />
        )}
        <div>
          <p className="text-sm text-nexa-ink-3">{agent?.email ?? agentId}</p>
          {detail ? (
            <p className="text-[11px] text-nexa-ink-4">{freshnessCopy(detail)}</p>
          ) : null}
        </div>
      </div>

      <FilterTabs
        options={[
          { value: "7d", label: "7 days" },
          { value: "30d", label: "30 days" },
          { value: "90d", label: "90 days" },
        ]}
        value={range}
        onChange={setRange}
      />

      {error ? (
        <ErrorState
          title="Failed to load agent performance"
          detail={error}
          onRetry={() => void refreshPerformance()}
        />
      ) : loading && !detail ? (
        <LoadingState label="Loading performance…" />
      ) : detail ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentPerformanceStrip metrics={detail.metrics} freshness={detail} />
              {detail.signals.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {detail.signals.map((signal) => (
                    <Badge key={signal.id} variant="warning">
                      {signalChip(signal.type)}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {detail.trend.map((point) => (
                  <div
                    key={point.period}
                    className="rounded-md border border-nexa-line p-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-nexa-ink-4">
                      {point.period === "previous" ? "Previous period" : "Current period"}
                    </p>
                    <p className="mt-2 text-sm text-nexa-ink">
                      Agent {formatRating(point.averageAgentRating, point.reviewCount)}
                    </p>
                    <p className="text-sm text-nexa-ink">
                      Solved {formatPercent(point.problemSolvedRate)}
                    </p>
                    <p className="text-sm text-nexa-ink">
                      FR SLA {formatPercent(point.firstResponseSlaRate)} · Resolution{" "}
                      {formatPercent(point.resolutionSlaRate)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <OperationsCategoriesTable rows={detail.categories} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.feedback.length === 0 ? (
                <EmptyState title="No reviews in this range" />
              ) : (
                <ul className="divide-y divide-nexa-line">
                  {detail.feedback.map((item) => (
                    <li key={`${item.ticketId}-${item.submittedAt}`} className="py-3">
                      <p className="text-xs text-nexa-ink-4">
                        {categoryLabel(item.category)} · Agent{" "}
                        {formatRating(item.agentRating)} ·{" "}
                        {item.problemSolved == null
                          ? "Solved not recorded"
                          : item.problemSolved
                            ? "Solved"
                            : "Not solved"}{" "}
                        · <RelativeTime value={item.submittedAt} />
                      </p>
                      {item.comment ? (
                        <p className="mt-1 text-sm text-nexa-ink">{item.comment}</p>
                      ) : (
                        <p className="mt-1 text-sm text-nexa-ink-4">No comment</p>
                      )}
                      <Link
                        href={`/support?ticket=${encodeURIComponent(item.ticketId)}`}
                        className="mt-1 inline-block text-xs font-medium text-nexa-primary"
                      >
                        Open ticket
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Coaching notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const note = noteDraft.trim();
              if (!note || noteBusy) return;
              setNoteBusy(true);
              void createCoachingNote(agentId, {
                note,
                followUpAt: followUpAt
                  ? new Date(followUpAt).toISOString()
                  : undefined,
              })
                .then(() => {
                  setNoteDraft("");
                  setFollowUpAt("");
                  return refreshNotes();
                })
                .finally(() => setNoteBusy(false));
            }}
          >
            <textarea
              className="min-h-[88px] w-full rounded-md border border-nexa-line px-3 py-2 text-sm"
              maxLength={4000}
              placeholder="Coaching note"
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-nexa-ink-4">
                Follow-up
                <input
                  type="datetime-local"
                  className="ml-2 rounded-md border border-nexa-line px-2 py-1 text-xs"
                  value={followUpAt}
                  onChange={(event) => setFollowUpAt(event.target.value)}
                />
              </label>
              <Button size="sm" type="submit" disabled={noteBusy || !noteDraft.trim()}>
                Add note
              </Button>
            </div>
          </form>
          {notes.length === 0 ? (
            <EmptyState title="No coaching notes" />
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li key={note.id} className="rounded-md border border-nexa-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={note.status === "OPEN" ? "warning" : "neutral"}>
                      {note.status}
                    </Badge>
                    {note.followUpOverdue ? (
                      <Badge variant="danger">Follow-up overdue</Badge>
                    ) : null}
                    <RelativeTime value={note.createdAt} className="text-[11px] text-nexa-ink-4" />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-nexa-ink">{note.note}</p>
                  {note.status === "OPEN" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={noteBusy}
                        onClick={() => {
                          setNoteBusy(true);
                          void patchCoachingNote(note.id, { status: "COMPLETED" })
                            .then(() => refreshNotes())
                            .finally(() => setNoteBusy(false));
                        }}
                      >
                        Mark completed
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-nexa-ink-4">
                      Completed
                      {note.completedAt ? ` · ${new Date(note.completedAt).toLocaleString()}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
