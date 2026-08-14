import { ErrorState, LoadingState } from "@/components/ui/states";
import type { AdminUserDetail } from "@/lib/api/users-admin";
import type { StaysPersonOverview } from "@/lib/api/stays-admin";
import { PersonIdentityOverview } from "./person-identity-overview";
import { PersonMetrics } from "./person-metrics";

export function PersonOverview({
  identity,
  identityLoading,
  identityError,
  onRetryIdentity,
  stays,
  staysLoading,
  staysError,
  onRetryStays,
}: {
  identity: AdminUserDetail | null;
  identityLoading: boolean;
  identityError: string | null;
  onRetryIdentity: () => void;
  stays: StaysPersonOverview | null;
  staysLoading: boolean;
  staysError: string | null;
  onRetryStays: () => void;
}) {
  return (
    <div className="space-y-6">
      {identityLoading && !identity ? (
        <LoadingState label="Loading identity…" className="py-6" />
      ) : identityError && !identity ? (
        <ErrorState
          title="Couldn't load identity"
          detail={identityError}
          onRetry={onRetryIdentity}
        />
      ) : (
        <PersonIdentityOverview identity={identity} />
      )}

      {staysLoading && !stays ? (
        <LoadingState label="Loading operational context…" className="py-6" />
      ) : staysError && !stays ? (
        <ErrorState
          title="Couldn't load operational context"
          detail={staysError}
          onRetry={onRetryStays}
        />
      ) : stays ? (
        <PersonMetrics stays={stays} />
      ) : null}
    </div>
  );
}
