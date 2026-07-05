"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { fetchKycRecords } from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { formatDate } from "@/lib/utils";
import type { KycStatus } from "@/lib/types";

type Filter = "all" | KycStatus;

export default function KycPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const { data: kycRecords, loading, error } = useAsyncList(fetchKycRecords, []);

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
        title="KYC / Verification"
        description="Identity verification queue from the Identity service (source=STAYS)."
      />

      {error && (
        <p className="mb-4 text-sm text-nexa-danger">Failed to load KYC queue: {error}</p>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "pending", label: "Pending", count: counts.pending ?? 0 },
            { value: "verified", label: "Verified", count: counts.verified ?? 0 },
            { value: "rejected", label: "Rejected", count: counts.rejected ?? 0 },
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
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        {!loading && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-nexa-ink-4">No KYC records found.</p>
        )}
      </Card>
    </div>
  );
}
