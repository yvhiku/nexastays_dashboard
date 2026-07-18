"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Eye, RotateCcw, Star, ShieldCheck, Wallet, Home } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { SearchInput, FilterTabs } from "@/components/ui/toolbar";
import { Avatar } from "@/components/ui/avatar";
import { fetchUsers, fetchUserDrawerDetails, type UserDrawerDetails } from "@/lib/api/users-admin";
import { updateUserAccountStatus } from "@/lib/api/identity-admin";
import { approveHost, rejectHost } from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { AppUser } from "@/lib/types";

type Filter = "all" | "active" | "suspended" | "banned";

export default function GuestsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const { data: users, loading, error, reload } = useAsyncList(fetchUsers, []);

  const guests = useMemo(
    () => users.filter((u) => u.role === "guest" || u.role === "both"),
    [users],
  );

  const counts = useMemo(
    () => ({
      all: guests.length,
      active: guests.filter((u) => u.status === "active").length,
      suspended: guests.filter((u) => u.status === "suspended").length,
      banned: guests.filter((u) => u.status === "banned").length,
    }),
    [guests],
  );

  const filtered = guests.filter((u) => {
    const matchFilter =
      filter === "all" ? true : u.status === filter || (filter === "active" && u.status === "pending");
    const matchQuery =
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.phone.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  async function runHostAction(id: string, action: "approve" | "reject") {
    setActing(id);
    try {
      if (action === "approve") await approveHost(id);
      else await rejectHost(id, "Rejected by admin");
      await reload();
      setSelected(null);
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Guests"
        description="Guest accounts — suspend or reactivate when needed. Host work lives under Hosts."
      />

      {error && (
        <p className="mb-4 text-sm text-nexa-danger">Failed to load guests: {error}</p>
      )}
      {loading && (
        <p className="mb-4 text-sm text-nexa-ink-4">Loading guests…</p>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "active", label: "Active", count: counts.active },
            { value: "suspended", label: "Suspended", count: counts.suspended },
            { value: "banned", label: "Banned", count: counts.banned },
          ]}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name or email…"
          className="lg:w-72"
        />
      </div>

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>User</TH>
              <TH>Role</TH>
              <TH>KYC</TH>
              <TH>City</TH>
              <TH>Joined</TH>
              <TH>Last active</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <tbody>
            {filtered.map((u) => (
              <TR key={u.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} color={u.avatarColor} />
                    <div>
                      <p className="font-medium text-nexa-ink">{u.name}</p>
                      <p className="text-xs text-nexa-ink-4">{u.email}</p>
                    </div>
                  </div>
                </TD>
                <TD>
                  <Badge variant={u.role === "guest" ? "neutral" : "primary"}>
                    {u.role === "both" ? "Guest + Host" : u.role}
                  </Badge>
                </TD>
                <TD>
                  <StatusBadge status={u.kyc} />
                </TD>
                <TD className="text-nexa-ink-3">{u.city}</TD>
                <TD className="text-nexa-ink-3">{u.joinedAt ? formatDate(u.joinedAt) : "—"}</TD>
                <TD className="text-nexa-ink-3">
                  <RelativeTime value={u.lastActiveAt} className="text-nexa-ink-3" />
                </TD>
                <TD>
                  <StatusBadge status={u.status} />
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" title="View" onClick={() => setSelected(u)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {u.status === "pending" && u.hostProfileId && (
                      <>
                        <Button
                          variant="success"
                          size="icon"
                          title="Approve host"
                          disabled={acting === u.hostProfileId}
                          onClick={() => runHostAction(u.hostProfileId!, "approve")}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="danger-outline"
                          size="icon"
                          title="Reject host"
                          disabled={acting === u.hostProfileId}
                          onClick={() => runHostAction(u.hostProfileId!, "reject")}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {u.status === "active" ? (
                      <Button variant="outline" size="icon" title="Suspend">
                        <Ban className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="icon" title="Reset status">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-nexa-ink-4">No users found.</p>
        )}
      </Card>

      <UserDrawer
        user={selected}
        onClose={() => setSelected(null)}
        onStatusChanged={async (userId) => {
          await reload();
          const fresh = (await fetchUsers()).find((u) => u.id === userId);
          if (fresh) setSelected(fresh);
        }}
      />
    </div>
  );
}

function UserDrawer({
  user,
  onClose,
  onStatusChanged,
}: {
  user: AppUser | null;
  onClose: () => void;
  onStatusChanged: (userId: string) => Promise<void>;
}) {
  const [details, setDetails] = useState<UserDrawerDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const isRestricted =
    user?.status === "suspended" || user?.status === "banned";
  const canSuspend = user?.status === "active" || user?.status === "pending";
  const canReactivate = isRestricted;

  async function handleSuspend() {
    if (!user || !canSuspend) return;
    const ok = window.confirm(
      `Suspend ${user.name}?\n\nThey will be marked SUSPENDED in Identity. Reactivate anytime with Reset status.`,
    );
    if (!ok) return;
    setStatusUpdating(true);
    setStatusError(null);
    try {
      await updateUserAccountStatus(user.id, "SUSPENDED");
      await onStatusChanged(user.id);
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Failed to suspend user",
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleReactivate() {
    if (!user || !canReactivate) return;
    const ok = window.confirm(`Reactivate ${user.name} and restore ACTIVE status?`);
    if (!ok) return;
    setStatusUpdating(true);
    setStatusError(null);
    try {
      await updateUserAccountStatus(user.id, "ACTIVE");
      await onStatusChanged(user.id);
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Failed to reactivate user",
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  useEffect(() => {
    setStatusError(null);
  }, [user?.id, user?.status]);

  useEffect(() => {
    if (!user) {
      setDetails(null);
      return;
    }
    let active = true;
    setLoadingDetails(true);
    fetchUserDrawerDetails(user)
      .then((data) => {
        if (active) setDetails(data);
      })
      .catch(() => {
        if (active) setDetails(null);
      })
      .finally(() => {
        if (active) setLoadingDetails(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const isHost = user?.role !== "guest";
  const stats = useMemo(
    () => ({
      listings: details?.listingsCount ?? user?.listingsCount ?? 0,
      bookings: details?.bookingsCount ?? user?.bookingsCount ?? 0,
      guestBookings: details?.guestBookingsCount ?? 0,
      earnings: details?.earnings ?? user?.earnings ?? 0,
    }),
    [details, user],
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-nexa-ink/40 transition-opacity",
          user ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-nexa-line bg-white transition-transform",
          user ? "translate-x-0" : "translate-x-full",
        )}
      >
        {user && (
          <div className="p-5">
            <div className="flex items-center gap-4">
              <Avatar name={user.name} color={user.avatarColor} size="lg" />
              <div>
                <h2 className="font-display text-xl font-semibold text-nexa-ink">
                  {user.name}
                </h2>
                <p className="text-sm text-nexa-ink-3">{user.email}</p>
                {user.phone !== "—" && (
                  <p className="text-sm text-nexa-ink-4">{user.phone}</p>
                )}
                {user.city !== "—" && (
                  <p className="text-xs text-nexa-ink-4">{user.city}</p>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={user.status} />
                  <StatusBadge status={user.kyc} />
                </div>
              </div>
            </div>

            {isHost && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stat icon={Home} label="Listings" value={String(stats.listings)} />
                <Stat icon={ShieldCheck} label="Bookings" value={String(stats.bookings)} />
                <Stat icon={Wallet} label="Host GMV" value={formatCurrency(stats.earnings)} />
                <Stat icon={Star} label="As guest" value={`${stats.guestBookings} trips`} />
              </div>
            )}

            {!isHost && stats.guestBookings > 0 && (
              <div className="mt-5 rounded-md border border-nexa-line p-3">
                <p className="text-lg font-semibold text-nexa-ink">{stats.guestBookings}</p>
                <p className="text-xs text-nexa-ink-4">Stays bookings</p>
              </div>
            )}

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase text-nexa-ink-4">
                Activity timeline
              </p>
              {loadingDetails && (
                <p className="text-sm text-nexa-ink-4">Loading activity…</p>
              )}
              {!loadingDetails && details && details.timeline.length === 0 && (
                <p className="text-sm text-nexa-ink-4">No activity recorded yet.</p>
              )}
              {!loadingDetails && details && details.timeline.length > 0 && (
                <ol className="space-y-3 border-l border-nexa-line pl-4">
                  {details.timeline.map((a) => (
                    <li key={`${a.label}-${a.at}`} className="relative text-sm text-nexa-ink-2">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-nexa-primary" />
                      {a.label}
                      <RelativeTime value={a.at} className="ml-2 text-xs text-nexa-ink-4" />
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {statusError && (
              <p className="mt-4 text-sm text-nexa-danger">{statusError}</p>
            )}

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={!canReactivate || statusUpdating}
                onClick={handleReactivate}
              >
                <RotateCcw className="h-4 w-4" />
                {statusUpdating ? "Updating…" : "Reset status"}
              </Button>
              <Button
                variant="danger-outline"
                className="flex-1"
                disabled={!canSuspend || statusUpdating}
                onClick={handleSuspend}
              >
                <Ban className="h-4 w-4" />
                {statusUpdating ? "Updating…" : "Suspend"}
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-nexa-line p-3">
      <Icon className="h-4 w-4 text-nexa-primary" />
      <p className="mt-2 text-lg font-semibold text-nexa-ink">{value}</p>
      <p className="text-xs text-nexa-ink-4">{label}</p>
    </div>
  );
}
