"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { CollectionCard, ResponsiveCollection } from "@/components/ui/collection";
import { DetailSheet } from "@/components/ui/detail-sheet";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { fetchKycRecords } from "@/lib/api/stays-admin";
import { fetchKycCase, type KycCase } from "@/lib/api/identity-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { formatDate } from "@/lib/utils";
import type { KycRecord, KycStatus } from "@/lib/types";

type Filter = "all" | KycStatus;

function normalizeKycFilter(raw: string | null): Filter {
  if (raw === "pending" || raw === "verified" || raw === "rejected" || raw === "all") {
    return raw;
  }
  return "all";
}

export default function KycPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-nexa-ink-4">Loading…</p>}>
      <KycPageInner />
    </Suspense>
  );
}

function KycPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = normalizeKycFilter(searchParams.get("status"));
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<KycRecord | null>(null);
  const { data: kycRecords, loading, error } = useAsyncList(fetchKycRecords, []);

  const replaceParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `/kyc?${qs}` : "/kyc");
    },
    [router, searchParams],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: kycRecords.length };
    for (const k of kycRecords) c[k.status] = (c[k.status] ?? 0) + 1;
    return c;
  }, [kycRecords]);

  const filtered = kycRecords.filter((k) => {
    const matchFilter = filter === "all" || k.status === filter;
    const matchQuery =
      k.name.toLowerCase().includes(query.toLowerCase()) ||
      k.documentType.toLowerCase().includes(query.toLowerCase()) ||
      k.provider.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  return (
    <div>
      <PageHeader
        title="KYC"
        description="Identity verification queue (source=STAYS)."
      />

      {error && (
        <ErrorState className="mb-4" title="Failed to load KYC queue" detail={error} />
      )}

      <PageToolbar
        className="mb-4"
        filters={
          <FilterTabs<Filter>
            value={filter}
            onChange={(next) => replaceParams({ status: next === "all" ? null : next })}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "pending", label: "Pending", count: counts.pending ?? 0 },
              { value: "verified", label: "Verified", count: counts.verified ?? 0 },
              { value: "rejected", label: "Rejected", count: counts.rejected ?? 0 },
            ]}
          />
        }
        trailing={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search name, document, provider…"
            className="lg:w-72"
          />
        }
      />

      <Card>
        {loading && kycRecords.length === 0 ? (
          <LoadingState label="Loading KYC applications…" />
        ) : (
          <ResponsiveCollection
            table={
          <Table>
            <THead>
              <tr>
                <TH>Applicant</TH>
                <TH>Role</TH>
                <TH>Document</TH>
                <TH>Provider</TH>
                <TH>Submitted</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <tbody>
              {filtered.map((k) => (
                <TR key={k.id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-nexa-ink-4" />
                      <span className="font-medium text-nexa-ink">{k.name}</span>
                    </div>
                  </TD>
                  <TD>
                    <Badge variant={k.role === "host" ? "primary" : "neutral"}>
                      {k.role}
                    </Badge>
                  </TD>
                  <TD className="text-nexa-ink-3">{k.documentType}</TD>
                  <TD className="text-nexa-ink-3">{k.provider}</TD>
                  <TD className="text-nexa-ink-3">{formatDate(k.submittedAt)}</TD>
                  <TD>
                    <StatusBadge status={k.status} />
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="View case"
                        onClick={() => setSelected(k)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
            }
            cards={
              <div className="space-y-2 p-3">
                {filtered.map((k) => (
                  <CollectionCard key={k.id} onClick={() => setSelected(k)}>
                    <p className="font-medium text-nexa-ink">{k.name}</p>
                    <p className="mt-1 text-xs text-nexa-ink-4">
                      {k.role} · {k.documentType} · {k.provider}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <StatusBadge status={k.status} />
                      <span className="text-xs text-nexa-ink-4">
                        {formatDate(k.submittedAt)}
                      </span>
                    </div>
                  </CollectionCard>
                ))}
              </div>
            }
          />
        )}
        {!loading && filtered.length === 0 && (
          <EmptyState title="No KYC records found." />
        )}
      </Card>

      <KycDrawer record={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function KycDrawer({
  record,
  onClose,
}: {
  record: KycRecord | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<KycCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record) {
      setDetail(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchKycCase(record.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load KYC case");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [record]);

  const data = detail;

  return (
    <DetailSheet
      open={Boolean(record)}
      onClose={onClose}
      title={record?.name ?? "KYC"}
      width="md"
      footer={
        record ? (
          <StickyActionBar>
            <div className="flex gap-2">
              <Button variant="success" className="flex-1" disabled title="Identity POST /admin/kyc/:id/approve is not exposed yet">
                Approve
              </Button>
              <Button variant="danger-outline" className="flex-1" disabled title="Identity POST /admin/kyc/:id/reject is not exposed yet">
                Reject
              </Button>
            </div>
            <p className="mt-2 text-xs text-nexa-ink-4">
              Approve / reject stay disabled until Identity exposes POST /admin/kyc/:id/approve
              and /reject. The service methods already exist on the backend.
            </p>
          </StickyActionBar>
        ) : undefined
      }
    >
        {record && (
          <div className="p-5">
            <h2 className="font-display text-xl font-semibold text-nexa-ink">{record.name}</h2>
            <div className="mt-2">
              <StatusBadge status={data?.status ?? record.status} />
            </div>
            {loading && <p className="mt-4 text-sm text-nexa-ink-4">Loading case…</p>}
            {error && <p className="mt-4 text-sm text-nexa-danger">{error}</p>}
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-nexa-ink-4">Provider</dt>
                <dd className="font-medium">{data?.provider ?? record.provider}</dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Document</dt>
                <dd className="font-medium">{data?.documentType ?? record.documentType}</dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Submitted</dt>
                <dd className="font-medium">
                  {formatDate(data?.submittedAt ?? record.submittedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-nexa-ink-4">Source</dt>
                <dd className="font-medium">{data?.source ?? "STAYS"}</dd>
              </div>
              {data?.email && (
                <div>
                  <dt className="text-xs text-nexa-ink-4">Email</dt>
                  <dd className="font-medium">{data.email}</dd>
                </div>
              )}
              {data?.phone && (
                <div>
                  <dt className="text-xs text-nexa-ink-4">Phone</dt>
                  <dd className="font-medium">{data.phone}</dd>
                </div>
              )}
            </dl>
            {(data?.failureReason || record.failureReason) && (
              <div className="mt-4 rounded-md bg-nexa-danger-soft p-3 text-sm text-nexa-danger">
                {data?.failureReason ?? record.failureReason}
              </div>
            )}
          </div>
        )}
    </DetailSheet>
  );
}
