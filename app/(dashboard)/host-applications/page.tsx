"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, FileText, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { SearchInput, FilterTabs } from "@/components/ui/toolbar";
import { Avatar } from "@/components/ui/avatar";
import {
  approveHostApplication,
  fetchHostApplications,
  rejectHostApplication,
} from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { formatDate, cn } from "@/lib/utils";
import type { HostApplication, HostApplicationFilterStatus } from "@/lib/types";

type Filter = "all" | HostApplicationFilterStatus;

function matchesFilter(app: HostApplication, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "pending") {
    return app.applicationStatus === "PENDING" || app.applicationStatus === "DRAFT";
  }
  if (filter === "approved") return app.applicationStatus === "APPROVED";
  return app.applicationStatus === "REJECTED" || app.verificationStatus === "REJECTED";
}

function applicationStatusLabel(status: string) {
  if (status === "DRAFT") return "draft";
  if (status === "PENDING") return "pending";
  if (status === "APPROVED") return "active";
  if (status === "REJECTED") return "rejected";
  return status.toLowerCase();
}

export default function HostApplicationsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<HostApplication | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const { data: applications, loading, error, reload } = useAsyncList(
    fetchHostApplications,
    [],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: applications.length };
    for (const app of applications) {
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
        c.rejected = (c.rejected ?? 0) + 1;
      }
    }
    return c;
  }, [applications]);

  const filtered = applications.filter((app) => {
    const matchFilter = matchesFilter(app, filter);
    const q = query.toLowerCase();
    const matchQuery =
      app.name.toLowerCase().includes(q) ||
      app.email.toLowerCase().includes(q) ||
      app.city.toLowerCase().includes(q) ||
      app.userId.toLowerCase().includes(q);
    return matchFilter && matchQuery;
  });

  async function runAction(
    id: string,
    action: "approve" | "reject",
    reason?: string,
  ) {
    setActing(id);
    try {
      if (action === "approve") await approveHostApplication(id);
      else await rejectHostApplication(id, reason?.trim() || "Rejected by admin");
      await reload();
      setSelected(null);
    } finally {
      setActing(null);
    }
  }

  const canReview = (app: HostApplication) =>
    app.applicationStatus === "PENDING" || app.applicationStatus === "DRAFT";

  return (
    <div>
      <PageHeader
        title="Host Applications"
        description="Review users who applied to become hosts via the web or mobile onboarding flow."
        actions={
          <Button size="sm" variant="outline" onClick={() => reload()} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {error && (
        <p className="mb-4 text-sm text-nexa-danger">
          Failed to load host applications: {error}
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "pending", label: "Pending review", count: counts.pending ?? 0 },
            { value: "approved", label: "Approved", count: counts.approved ?? 0 },
            { value: "rejected", label: "Rejected", count: counts.rejected ?? 0 },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, email, city…"
          className="lg:w-72"
        />
      </div>

      <Card>
        {loading ? (
          <p className="py-10 text-center text-sm text-nexa-ink-4">
            Loading host applications…
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Applicant</TH>
                <TH>Contact</TH>
                <TH>Host type</TH>
                <TH>Identity</TH>
                <TH>Submitted</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {filtered.map((app) => (
                <TR key={app.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={app.name} color={app.avatarColor} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-nexa-ink">{app.name}</p>
                        <p className="truncate text-xs text-nexa-ink-4">{app.city}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <p className="text-sm text-nexa-ink-2">{app.email}</p>
                    <p className="text-xs text-nexa-ink-4">{app.phone}</p>
                  </TD>
                  <TD className="text-nexa-ink-3 capitalize">
                    {app.hostType?.replace(/_/g, " ") ?? "—"}
                  </TD>
                  <TD>
                    <Badge
                      variant={
                        app.identityStatus === "VERIFIED"
                          ? "success"
                          : app.identityReused
                            ? "info"
                            : "neutral"
                      }
                    >
                      {app.identityReused
                        ? "Reused KYC"
                        : app.identityStatus.replace(/_/g, " ")}
                    </Badge>
                  </TD>
                  <TD className="text-nexa-ink-3">
                    {app.submittedAt ? formatDate(app.submittedAt) : "—"}
                  </TD>
                  <TD>
                    <StatusBadge status={applicationStatusLabel(app.applicationStatus)} />
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View details"
                        onClick={() => setSelected(app)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canReview(app) && (
                        <>
                          <Button
                            variant="success"
                            size="icon"
                            title="Approve"
                            disabled={acting === app.id}
                            onClick={() => runAction(app.id, "approve")}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="danger-outline"
                            size="icon"
                            title="Reject"
                            disabled={acting === app.id}
                            onClick={() => setSelected(app)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-nexa-ink-4">
            No host applications match your filters.
          </p>
        )}
      </Card>

      <ApplicationDrawer
        application={selected}
        acting={acting}
        onClose={() => setSelected(null)}
        onAction={runAction}
        canReview={selected ? canReview(selected) : false}
      />
    </div>
  );
}

function ApplicationDrawer({
  application,
  acting,
  onClose,
  onAction,
  canReview,
}: {
  application: HostApplication | null;
  acting: string | null;
  onClose: () => void;
  onAction: (id: string, action: "approve" | "reject", reason?: string) => Promise<void>;
  canReview: boolean;
}) {
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setRejectReason("");
  }, [application?.id]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-nexa-ink/40 transition-opacity",
          application ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-nexa-line bg-white transition-transform",
          application ? "translate-x-0" : "translate-x-full",
        )}
      >
        {application && (
          <div className="p-5">
            <div className="flex items-start gap-3">
              <Avatar name={application.name} color={application.avatarColor} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-semibold text-nexa-ink">
                  {application.name}
                </h2>
                <p className="mt-0.5 text-sm text-nexa-ink-3">{application.email}</p>
                <div className="mt-2">
                  <StatusBadge
                    status={applicationStatusLabel(application.applicationStatus)}
                  />
                </div>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Phone" value={application.phone} />
              <Detail label="City" value={application.city} />
              <Detail
                label="Host type"
                value={application.hostType?.replace(/_/g, " ") ?? "—"}
              />
              <Detail label="Document" value={application.documentType ?? "—"} />
              <Detail label="Identity" value={application.identityStatus.replace(/_/g, " ")} />
              <Detail
                label="KYC reused"
                value={application.identityReused ? "Yes" : "No"}
              />
              <Detail label="Source" value={application.source ?? "—"} />
              <Detail label="Channel" value={application.submittedFrom ?? "—"} />
              <Detail
                label="Submitted"
                value={
                  application.submittedAt ? formatDate(application.submittedAt) : "—"
                }
              />
              {application.reviewedAt && (
                <Detail label="Reviewed" value={formatDate(application.reviewedAt)} />
              )}
            </dl>

            {(application.documentFrontAssetId ||
              application.documentBackAssetId ||
              application.selfieAssetId) && (
              <div className="mt-5 rounded-md border border-nexa-line p-3">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase text-nexa-ink-4">
                  <FileText className="h-3.5 w-3.5" />
                  Uploaded documents
                </p>
                <ul className="mt-2 space-y-1 text-xs text-nexa-ink-3">
                  {application.documentFrontAssetId && (
                    <li>ID front: {application.documentFrontAssetId.slice(0, 8)}…</li>
                  )}
                  {application.documentBackAssetId && (
                    <li>ID back: {application.documentBackAssetId.slice(0, 8)}…</li>
                  )}
                  {application.selfieAssetId && (
                    <li>Selfie: {application.selfieAssetId.slice(0, 8)}…</li>
                  )}
                </ul>
              </div>
            )}

            {application.rejectionReason && (
              <div className="mt-5 rounded-md border border-nexa-danger/30 bg-nexa-danger-soft p-3">
                <p className="text-xs font-semibold uppercase text-nexa-danger">
                  Rejection reason
                </p>
                <p className="mt-1 text-sm text-nexa-ink-2">
                  {application.rejectionReason}
                </p>
              </div>
            )}

            {canReview && (
              <div className="mt-5 space-y-3">
                <label className="block text-xs font-semibold uppercase text-nexa-ink-4">
                  Rejection reason (optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why the application was rejected…"
                  className="w-full rounded-md border border-nexa-line px-3 py-2 text-sm text-nexa-ink placeholder:text-nexa-ink-4 focus:border-nexa-primary focus:outline-none focus:ring-1 focus:ring-nexa-primary"
                />
                <div className="flex gap-2">
                  <Button
                    variant="success"
                    className="flex-1"
                    disabled={acting === application.id}
                    onClick={() => onAction(application.id, "approve")}
                  >
                    <Check className="h-4 w-4" /> Approve host
                  </Button>
                  <Button
                    variant="danger-outline"
                    className="flex-1"
                    disabled={acting === application.id}
                    onClick={() =>
                      onAction(application.id, "reject", rejectReason)
                    }
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            )}

            <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-nexa-ink-4">{label}</dt>
      <dd className="mt-0.5 capitalize text-nexa-ink-2">{value}</dd>
    </div>
  );
}
