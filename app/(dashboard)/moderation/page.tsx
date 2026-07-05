"use client";

import { useState } from "react";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { FilterTabs } from "@/components/ui/toolbar";
import { fetchRiskFlags } from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";

type Filter = "all" | "open" | "reviewing" | "resolved";

export default function ModerationPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: riskFlags, loading } = useAsyncList(fetchRiskFlags, []);

  const filtered = riskFlags.filter((r) => filter === "all" || r.status === filter);

  return (
    <div>
      <PageHeader
        title="Moderation & Risk"
        description="Risk flags and fraud signals (Stays API not yet available)."
      />

      <Card className="mb-4 border-nexa-warning/30 bg-nexa-warning-soft/30">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-[#8A5B00]" />
          <p className="text-sm text-nexa-ink-3">
            Moderation endpoints are not implemented on the Stays backend yet. This page will
            populate when risk/fraud APIs are added.
          </p>
        </CardContent>
      </Card>

      <div className="mb-4">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: riskFlags.length },
            { value: "open", label: "Open", count: 0 },
            { value: "reviewing", label: "Reviewing", count: 0 },
            { value: "resolved", label: "Resolved", count: 0 },
          ]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Risk queue
          </CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${filtered.length} items`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-nexa-ink-4">No risk flags in the database.</p>
        </CardContent>
      </Card>
    </div>
  );
}
