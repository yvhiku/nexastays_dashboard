"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Eye } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { fetchKycRecords } from "@/lib/api/stays-admin";
import { fetchKycCase, type KycCase } from "@/lib/api/identity-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { formatDate, cn } from "@/lib/utils";
import type { KycRecord, KycStatus } from "@/lib/types";

type Filter = "all" | KycStatus;

function normalizeKycFilter(raw: string | null): Filter {
  if (raw === "pending" || raw === "verified" || raw === "rejected" || raw === "all") {
    return raw;
  }
  return "pending";
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
  const [filter, setFilter] = useState<Filter>(() =>
    normalizeKycFilter(searchParams.get("status")),
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<KycRecord | null>(null);
  const { data: kycRecords, loading, error } = useAsyncList(fetchKycRecords, []);

  useEffect(() => {
    setFilter(normalizeKycFilter(searchParams.get("status")));
  }, [searchParams]);

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
        <p className="mb-4 text-sm text-nexa-danger">Failed to load KYC queue: {error}</p>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: "Pending", count: counts.pending ?? 0 },
            { value: "verified", label: "Verified", count: counts.verified ?? 0 },
            { value: "rejected", label: "Rejected", count: counts.rejected ?? 0 },
            { value: "all", label: "All", count: counts.all },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name, document, provider…"
          className="lg:w-72"
        />
      </div>

      <Card>
        {loading ? (
          <p className="py-10 text-center text-sm text-nexa-ink-4">Loading KYC applications…</p>
        ) : (
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
        )}
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-nexa-ink-4">No KYC records found.</p>
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
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-nexa-ink/40 transition-opacity",
          record ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-nexa-line bg-white transition-transform",
          record ? "translate-x-0" : "translate-x-full",
        )}
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
            <div className="mt-6 space-y-2">
              <Button variant="success" className="w-full" disabled title="Identity POST /admin/kyc/:id/approve is not exposed yet">
                Approve
              </Button>
              <Button variant="danger-outline" className="w-full" disabled title="Identity POST /admin/kyc/:id/reject is not exposed yet">
                Reject
              </Button>
              <p className="text-xs text-nexa-ink-4">
                Approve / reject stay disabled until Identity exposes POST /admin/kyc/:id/approve
                and /reject. The service methods already exist on the backend.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
