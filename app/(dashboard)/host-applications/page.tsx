"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  fetchHostApplicationDocumentBlobUrl,
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
      app.phone.toLowerCase().includes(q) ||
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
      setSelected(null);
      await reload();
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
          placeholder="Search name, email, phone…"
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
                        <p className="truncate text-xs text-nexa-ink-4">
                          {app.hostType?.replace(/_/g, " ") ?? "Host applicant"}
                        </p>
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
  const [docUrls, setDocUrls] = useState<{
    front?: string;
    back?: string;
    selfie?: string;
  }>({});
  const [docError, setDocError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ label: string; url: string } | null>(
    null,
  );
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    setRejectReason("");
    setLightbox(null);
  }, [application?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadDocs() {
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      blobUrlsRef.current = [];

      if (!application) {
        setDocUrls({});
        setDocError(null);
        return;
      }
      setDocUrls({});
      setDocError(null);
      try {
        const next: { front?: string; back?: string; selfie?: string } = {};
        const kinds: Array<{
          key: "front" | "back" | "selfie";
          enabled: boolean;
        }> = [
          { key: "front", enabled: !!application.documentFrontAssetId },
          { key: "back", enabled: !!application.documentBackAssetId },
          { key: "selfie", enabled: !!application.selfieAssetId },
        ];
        for (const { key, enabled } of kinds) {
          if (!enabled) continue;
          const url = await fetchHostApplicationDocumentBlobUrl(application.id, key);
          blobUrlsRef.current.push(url);
          if (!cancelled) next[key] = url;
        }
        if (!cancelled) setDocUrls(next);
        else {
          for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
          blobUrlsRef.current = [];
        }
      } catch (err) {
        if (!cancelled) {
          setDocError(err instanceof Error ? err.message : "Failed to load documents");
        }
      }
    }

    loadDocs();
    return () => {
      cancelled = true;
    };
  }, [
    application?.id,
    application?.documentFrontAssetId,
    application?.documentBackAssetId,
    application?.selfieAssetId,
  ]);

  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      blobUrlsRef.current = [];
    };
  }, []);

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
                {docError && (
                  <p className="mt-2 text-xs text-nexa-danger">{docError}</p>
                )}
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {application.documentFrontAssetId && (
                    <DocPreview
                      label="ID front"
                      url={docUrls.front}
                      onOpen={(url) => setLightbox({ label: "ID front", url })}
                    />
                  )}
                  {application.documentBackAssetId && (
                    <DocPreview
                      label="ID back"
                      url={docUrls.back}
                      onOpen={(url) => setLightbox({ label: "ID back", url })}
                    />
                  )}
                  {application.selfieAssetId && (
                    <DocPreview
                      label="Selfie"
                      url={docUrls.selfie}
                      onOpen={(url) => setLightbox({ label: "Selfie", url })}
                    />
                  )}
                </div>
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

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-nexa-ink/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{lightbox.label}</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10"
                onClick={() => setLightbox(null)}
              >
                <X className="h-4 w-4" /> Close
              </Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.label}
              className="max-h-[85vh] w-full rounded-md bg-white object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

function DocPreview({
  label,
  url,
  onOpen,
}: {
  label: string;
  url?: string;
  onOpen: (url: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-nexa-ink-4">{label}</p>
      {url ? (
        <button
          type="button"
          onClick={() => onOpen(url)}
          className="group relative block w-full overflow-hidden rounded-md border border-nexa-line text-left focus:outline-none focus:ring-2 focus:ring-nexa-primary"
          title={`View ${label}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            className="max-h-44 w-full bg-nexa-bg-2 object-contain"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-nexa-ink/55 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
            Click to enlarge
          </span>
        </button>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-nexa-line bg-nexa-bg-2 text-xs text-nexa-ink-4">
          Loading…
        </div>
      )}
    </div>
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
