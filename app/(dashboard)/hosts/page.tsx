"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Snowflake, Users, X } from "lucide-react";
import { Person360Workspace } from "@/components/people/person-360-workspace";
import type { PersonTab } from "@/components/people/person-display";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollectionCard } from "@/components/ui/collection";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MasterDetail } from "@/components/ui/master-detail";
import { PageShell } from "@/components/ui/page-shell";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import {
  approveHostApplication,
  fetchHostApplications,
  freezeHost,
  rejectHostApplication,
  unfreezeHost,
} from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { formatDate } from "@/lib/utils";
import type { HostApplication, HostApplicationFilterStatus } from "@/lib/types";

type Filter = "all" | HostApplicationFilterStatus;
type HostAction = "approve" | "reject" | "freeze" | "unfreeze";

function matchesFilter(app: HostApplication, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "frozen") return Boolean(app.listingFrozen);
  if (filter === "pending") {
    return (
      !app.listingFrozen &&
      (app.applicationStatus === "PENDING" || app.applicationStatus === "DRAFT")
    );
  }
  if (filter === "approved") {
    return app.applicationStatus === "APPROVED" && !app.listingFrozen;
  }
  if (filter === "needs_changes" || filter === "rejected") {
    return (
      app.applicationStatus === "REJECTED" || app.verificationStatus === "REJECTED"
    );
  }
  return true;
}

function normalizeHostFilter(raw: string | null): Filter {
  if (
    raw === "pending" ||
    raw === "approved" ||
    raw === "needs_changes" ||
    raw === "rejected" ||
    raw === "frozen" ||
    raw === "all"
  ) {
    return raw;
  }
  return "all";
}

function applicationStatusLabel(status: string) {
  if (status === "DRAFT") return "draft";
  if (status === "PENDING") return "pending";
  if (status === "APPROVED") return "active";
  if (status === "REJECTED") return "rejected";
  return status.toLowerCase();
}

function canReview(app: HostApplication) {
  return app.applicationStatus === "PENDING" || app.applicationStatus === "DRAFT";
}

export default function HostsPage() {
  return (
    <Suspense
      fallback={
        <p className="py-10 text-center text-sm text-nexa-ink-4">Loading hosts…</p>
      }
    >
      <HostsPageInner />
    </Suspense>
  );
}

function HostsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const personId = searchParams.get("person");
  const tab = searchParams.get("tab");
  const filter = normalizeHostFilter(searchParams.get("status"));
  const q = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(q);
  const [acting, setActing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    app: HostApplication;
    action: HostAction;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: applications, loading, error, reload } = useAsyncList(
    fetchHostApplications,
    [],
  );

  const replaceParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `/hosts?${qs}` : "/hosts");
    },
    [router, searchParams],
  );

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput === q) return;
      replaceParams({ q: searchInput || null });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput, q, replaceParams]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: applications.length };
    for (const app of applications) {
      if (app.listingFrozen) {
        c.frozen = (c.frozen ?? 0) + 1;
        continue;
      }
      if (app.applicationStatus === "PENDING" || app.applicationStatus === "DRAFT") {
        c.pending = (c.pending ?? 0) + 1;
      }
      if (app.applicationStatus === "APPROVED") {
        c.approved = (c.approved ?? 0) + 1;
      }
      if (
        app.applicationStatus === "REJECTED" ||
        app.verificationStatus === "REJECTED"
      ) {
        c.needs_changes = (c.needs_changes ?? 0) + 1;
        c.rejected = (c.rejected ?? 0) + 1;
      }
    }
    return c;
  }, [applications]);

  const filtered = applications.filter((app) => {
    const matchFilter = matchesFilter(app, filter);
    const needle = searchInput.toLowerCase();
    const matchQuery =
      !needle ||
      app.name.toLowerCase().includes(needle) ||
      app.email.toLowerCase().includes(needle) ||
      app.phone.toLowerCase().includes(needle) ||
      app.userId.toLowerCase().includes(needle);
    return matchFilter && matchQuery;
  });

  const selectedApp = useMemo(
    () => (personId ? applications.find((app) => app.userId === personId) ?? null : null),
    [applications, personId],
  );

  const onTabChange = useCallback(
    (next: PersonTab) => {
      replaceParams({ tab: next });
    },
    [replaceParams],
  );

  async function runAction(app: HostApplication, action: HostAction) {
    setActing(app.id);
    try {
      if (action === "approve") await approveHostApplication(app.id);
      else if (action === "reject") {
        await rejectHostApplication(
          app.id,
          rejectReason.trim() || "Needs changes — rejected by admin",
        );
      } else if (action === "freeze") await freezeHost(app.id);
      else await unfreezeHost(app.id);
      setConfirm(null);
      setRejectReason("");
      await reload();
    } finally {
      setActing(null);
    }
  }

  const hasSelection = Boolean(personId);

  return (
    <PageShell variant="workspace">
      <div className="shrink-0 border-b border-nexa-line bg-white px-4 py-3 sm:px-6">
        <PageToolbar
          className={hasSelection ? "hidden lg:flex" : undefined}
          filters={
            <FilterTabs<Filter>
              value={filter}
              onChange={(next) => {
                replaceParams({
                  status: next === "all" ? null : next,
                });
              }}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "pending", label: "Pending", count: counts.pending ?? 0 },
                { value: "approved", label: "Approved", count: counts.approved ?? 0 },
                {
                  value: "needs_changes",
                  label: "Needs Changes",
                  count: counts.needs_changes ?? 0,
                },
                { value: "rejected", label: "Rejected", count: counts.rejected ?? 0 },
                { value: "frozen", label: "Frozen", count: counts.frozen ?? 0 },
              ]}
            />
          }
          trailing={
            <div className="flex items-center gap-2">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search name, email…"
                className="w-full md:w-64"
              />
              <Button size="sm" variant="outline" onClick={() => void reload()} disabled={loading}>
                Refresh
              </Button>
            </div>
          }
        />
        {error ? (
          <ErrorState
            className="mt-3"
            title="Failed to load hosts"
            detail={error}
            onRetry={() => void reload()}
          />
        ) : null}
      </div>

      <MasterDetail
        splitAt="lg"
        hasSelection={hasSelection}
        onBack={() => replaceParams({ person: null, tab: null })}
        backLabel="Back to Hosts"
        list={
          <div className="flex min-h-0 flex-1 flex-col bg-nexa-bg">
            {loading && applications.length === 0 ? (
              <LoadingState label="Loading host applications…" />
            ) : !loading && filtered.length === 0 ? (
              <EmptyState icon={Users} title="No hosts match your filters." />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="hidden lg:block">
                  {filtered.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() =>
                        replaceParams({
                          person: app.userId,
                          tab: tab || "hosting",
                        })
                      }
                      className={`block w-full border-b border-nexa-line px-4 py-3 text-left hover:bg-nexa-bg-2 ${
                        personId === app.userId ? "bg-nexa-primary-soft" : "bg-white"
                      }`}
                    >
                      <HostRow app={app} />
                    </button>
                  ))}
                </div>
                <div className="space-y-2 p-3 lg:hidden">
                  {filtered.map((app) => (
                    <CollectionCard
                      key={app.id}
                      selected={personId === app.userId}
                      onClick={() =>
                        replaceParams({
                          person: app.userId,
                          tab: tab || "hosting",
                        })
                      }
                    >
                      <HostRow app={app} />
                    </CollectionCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
        workspace={
          personId ? (
            <Person360Workspace
              key={personId}
              userId={personId}
              tab={tab}
              defaultTab="hosting"
              onTabChange={onTabChange}
              fallbackName={selectedApp?.name}
              fallbackEmail={selectedApp?.email}
              fallbackAvatarColor={selectedApp?.avatarColor}
              actions={
                selectedApp &&
                (canReview(selectedApp) ||
                  selectedApp.applicationStatus === "APPROVED" ||
                  Boolean(selectedApp.listingFrozen)) ? (
                  <HostActions
                    app={selectedApp}
                    acting={acting}
                    onAction={(action) => {
                      setRejectReason("");
                      setConfirm({ app: selectedApp, action });
                    }}
                  />
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              className="h-full"
              icon={Users}
              title="Select a host"
              description="Open a person from the list to see identity, hosting, and trust."
            />
          )
        }
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirmTitle(confirm?.action)}
        description={confirmDescription(confirm?.action, confirm?.app.name)}
        confirmLabel={confirmLabel(confirm?.action)}
        danger={confirm?.action === "reject" || confirm?.action === "freeze"}
        busy={Boolean(confirm && acting === confirm.app.id)}
        onConfirm={() => {
          if (confirm) void runAction(confirm.app, confirm.action);
        }}
        onCancel={() => {
          setConfirm(null);
          setRejectReason("");
        }}
      >
        {confirm?.action === "reject" ? (
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Explain why the application was rejected…"
            className="w-full rounded-md border border-nexa-line px-3 py-2 text-sm text-nexa-ink placeholder:text-nexa-ink-4 focus:border-nexa-primary focus:outline-none focus:ring-1 focus:ring-nexa-primary"
          />
        ) : null}
      </ConfirmDialog>
    </PageShell>
  );
}

function HostRow({ app }: { app: HostApplication }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar name={app.name} color={app.avatarColor} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-nexa-ink">{app.name}</p>
        <p className="truncate text-xs text-nexa-ink-4">{app.email}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <StatusBadge
            status={
              app.listingFrozen
                ? "frozen"
                : applicationStatusLabel(app.applicationStatus)
            }
          />
          <span className="text-[11px] text-nexa-ink-4">
            {app.submittedAt ? formatDate(app.submittedAt) : "Not collected"}
          </span>
        </div>
      </div>
    </div>
  );
}

function HostActions({
  app,
  acting,
  onAction,
}: {
  app: HostApplication;
  acting: string | null;
  onAction: (action: HostAction) => void;
}) {
  const busy = acting === app.id;
  return (
    <>
      {canReview(app) ? (
        <>
          <Button
            size="sm"
            variant="success"
            className="w-full justify-start"
            disabled={busy}
            onClick={() => onAction("approve")}
          >
            <Check className="h-4 w-4" /> Approve
          </Button>
          <Button
            size="sm"
            variant="danger-outline"
            className="w-full justify-start"
            disabled={busy}
            onClick={() => onAction("reject")}
          >
            <X className="h-4 w-4" /> Needs changes
          </Button>
        </>
      ) : null}
      {app.applicationStatus === "APPROVED" && !app.listingFrozen ? (
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start"
          disabled={busy}
          onClick={() => onAction("freeze")}
        >
          <Snowflake className="h-4 w-4" /> Freeze listings
        </Button>
      ) : null}
      {app.listingFrozen ? (
        <Button
          size="sm"
          variant="success"
          className="w-full justify-start"
          disabled={busy}
          onClick={() => onAction("unfreeze")}
        >
          <Check className="h-4 w-4" /> Unfreeze host
        </Button>
      ) : null}
    </>
  );
}

function confirmTitle(action?: HostAction) {
  if (action === "approve") return "Approve this host?";
  if (action === "reject") return "Reject this application?";
  if (action === "freeze") return "Freeze this host?";
  if (action === "unfreeze") return "Unfreeze this host?";
  return "Confirm";
}

function confirmDescription(action: HostAction | undefined, name?: string) {
  if (action === "approve") return `${name ?? "This host"} will be approved.`;
  if (action === "reject") return `${name ?? "This application"} will be marked as needs changes.`;
  if (action === "freeze") return `${name ?? "This host"}'s listings will be frozen.`;
  if (action === "unfreeze") return `${name ?? "This host"}'s listings will be restored.`;
  return undefined;
}

function confirmLabel(action?: HostAction) {
  if (action === "approve") return "Approve";
  if (action === "reject") return "Reject";
  if (action === "freeze") return "Freeze";
  if (action === "unfreeze") return "Unfreeze";
  return "Confirm";
}
