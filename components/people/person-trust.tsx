import Link from "next/link";
import { ErrorState, LoadingState } from "@/components/ui/states";
import type { AdminUserDetail } from "@/lib/api/users-admin";
import type { StaysPersonOverview } from "@/lib/api/stays-admin";
import { MetricCard, PersonField } from "./person-field";

export function PersonTrust({
  userId,
  identity,
  stays,
  loading,
  error,
  onRetry,
}: {
  userId: string;
  identity: AdminUserDetail | null;
  stays: StaysPersonOverview | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading && !stays) return <LoadingState label="Loading trust…" />;
  if (error && !stays) {
    return (
      <ErrorState title="Couldn't load trust" detail={error} onRetry={onRetry} />
    );
  }
  if (!stays) return null;

  const uid = encodeURIComponent(userId);
  const rows: Array<{
    label: string;
    value: number;
    href: string;
  }> = [
    {
      label: "Reports made",
      value: stays.trust.reportsMade,
      href: `/reports?kind=conversation_reported&reporterUserId=${uid}`,
    },
    {
      label: "Reports against",
      value: stays.trust.reportsAgainst,
      href: `/reports?kind=conversation_reported&reportedUserId=${uid}`,
    },
    {
      label: "Safety issues made",
      value: stays.trust.safetyIssuesMade,
      href: `/reports?kind=safety_issue&reporterUserId=${uid}`,
    },
    {
      label: "Safety issues against",
      value: stays.trust.safetyIssuesAgainst,
      href: `/reports?kind=safety_issue&reportedUserId=${uid}`,
    },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
          Account
        </h3>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PersonField label="Account status" value={identity?.accountStatus} />
          <PersonField
            label="Listings frozen"
            value={
              stays.hostProfile
                ? stays.hostProfile.listingFrozen
                  ? "Yes"
                  : "No"
                : "Not collected"
            }
          />
        </dl>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
          Reports and safety
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded-md border border-nexa-line p-3">
              <MetricCard label={row.label} value={row.value} />
              {row.value > 0 ? (
                <Link
                  href={row.href}
                  className="mt-2 inline-block text-xs font-medium text-nexa-primary hover:underline"
                >
                  View →
                </Link>
              ) : (
                <p className="mt-2 text-xs text-nexa-ink-4">No records</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
