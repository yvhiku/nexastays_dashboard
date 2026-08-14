import { Badge } from "@/components/ui/badge";
import type { StaysPersonOverview } from "@/lib/api/stays-admin";

export function personRoles(stays: StaysPersonOverview | null): {
  isHost: boolean;
  isGuest: boolean;
} {
  if (!stays) return { isHost: false, isGuest: false };
  const isHost = Boolean(stays.hostProfile) || stays.listings.total > 0;
  const isGuest = stays.bookingsAsGuest.total > 0 || !isHost;
  return { isHost, isGuest };
}

export function PersonRoleBadges({
  stays,
}: {
  stays: StaysPersonOverview | null;
}) {
  if (!stays) return null;
  const { isHost, isGuest } = personRoles(stays);
  if (isHost && isGuest) {
    return (
      <Badge variant="primary" dot>
        Host + Guest
      </Badge>
    );
  }
  if (isHost) {
    return (
      <Badge variant="primary" dot>
        Host
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" dot>
      Guest
    </Badge>
  );
}
