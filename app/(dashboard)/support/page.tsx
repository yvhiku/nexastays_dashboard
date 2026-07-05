"use client";

import { useState } from "react";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FilterTabs } from "@/components/ui/toolbar";
import { fetchTickets } from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import type { TicketStatus } from "@/lib/types";

type Filter = "all" | TicketStatus;

export default function SupportPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: tickets, loading } = useAsyncList(fetchTickets, []);
  const filtered = tickets.filter((t) => filter === "all" || t.status === filter);

  return (
    <div>
      <PageHeader
        title="Support & Disputes"
        description="Customer support tickets (not yet available on Stays API)."
      />

      <Card className="mb-4 border-nexa-warning/30 bg-nexa-warning-soft/30">
        <CardContent className="flex items-start gap-3 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-[#8A5B00]" />
          <p className="text-sm text-nexa-ink-3">
            Support ticket APIs are not implemented yet. Connect Identity or a dedicated support
            service when ready.
          </p>
        </CardContent>
      </Card>

      <div className="mb-4">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: tickets.length },
            { value: "open", label: "Open", count: 0 },
            { value: "in_progress", label: "In progress", count: 0 },
            { value: "resolved", label: "Resolved", count: 0 },
          ]}
        />
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-nexa-ink-4" />
          <p className="mt-3 text-sm text-nexa-ink-4">
            {loading ? "Loading…" : `No tickets (${filtered.length}).`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
