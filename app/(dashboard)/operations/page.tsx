"use client";

import Link from "next/link";
import {
  Home,
  UserCheck,
  BadgeCheck,
  AlertCircle,
  Radio,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchOpsOverview,
  EMPTY_OPS_OVERVIEW,
} from "@/lib/api/stays-admin";
import { useAsyncStats } from "@/lib/hooks/use-async-data";
import { formatNumber } from "@/lib/utils";

const QUEUES = [
  {
    key: "listings",
    title: "Listing Queue",
    description: "Submitted listings waiting for approve / reject",
    href: "/listings?status=pending",
    icon: Home,
    countKey: "pendingListings" as const,
  },
  {
    key: "hosts",
    title: "Host Queue",
    description: "Host applications awaiting review",
    href: "/hosts?status=pending",
    icon: UserCheck,
    countKey: "pendingHostApplications" as const,
  },
  {
    key: "kyc",
    title: "KYC Queue",
    description: "Identity verification cases",
    href: "/kyc?status=pending",
    icon: BadgeCheck,
    countKey: "pendingKyc" as const,
  },
  {
    key: "needs",
    title: "Needs Changes",
    description: "Rejected listings hosts must fix",
    href: "/listings?status=rejected",
    icon: AlertCircle,
    countKey: "needsChangesListings" as const,
  },
  {
    key: "live",
    title: "Live Listings",
    description: "Public inventory on Explore",
    href: "/listings?status=live",
    icon: Radio,
    countKey: "live" as const,
  },
] as const;

export default function OperationsPage() {
  const { data: overview, loading, error } = useAsyncStats(
    fetchOpsOverview,
    EMPTY_OPS_OVERVIEW,
    [],
  );

  const counts: Record<string, number> = {
    pendingListings: overview.attention.pendingListings,
    pendingHostApplications: overview.attention.pendingHostApplications,
    pendingKyc: overview.attention.pendingKyc ?? 0,
    needsChangesListings: overview.attention.needsChangesListings,
    live: overview.snapshot.liveListings,
  };

  return (
    <div>
      <PageHeader
        title="Operations"
        description="Your inbox — open a queue and clear what needs a decision."
      />

      {error && (
        <p className="mb-4 text-sm text-nexa-danger">
          Failed to load queues: {error}
        </p>
      )}

      <ul className="divide-y divide-nexa-line overflow-hidden rounded-xl border border-nexa-line bg-white">
        {QUEUES.map((q) => {
          const Icon = q.icon;
          const count = counts[q.countKey] ?? 0;
          return (
            <li key={q.key}>
              <Link
                href={q.href}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-nexa-bg-2"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-nexa-primary-soft text-nexa-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-nexa-ink">{q.title}</p>
                  <p className="truncate text-xs text-nexa-ink-4">
                    {q.description}
                  </p>
                </div>
                <span className="rounded-full bg-nexa-bg-2 px-2.5 py-1 text-sm font-semibold text-nexa-ink">
                  {loading ? "…" : formatNumber(count)}
                </span>
                <ChevronRight className="h-4 w-4 text-nexa-ink-4" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
