"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, RotateCcw, Users } from "lucide-react";
import { Person360Workspace } from "@/components/people/person-360-workspace";
import type { PersonTab } from "@/components/people/person-display";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollectionCard } from "@/components/ui/collection";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MasterDetail } from "@/components/ui/master-detail";
import { PageShell } from "@/components/ui/page-shell";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { FilterTabs, SearchInput } from "@/components/ui/toolbar";
import { updateUserAccountStatus } from "@/lib/api/identity-admin";
import { fetchUsers } from "@/lib/api/users-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { formatDate } from "@/lib/utils";
import type { AppUser } from "@/lib/types";

type Filter = "all" | "active" | "suspended" | "banned";

function normalizeGuestFilter(raw: string | null): Filter {
  if (raw === "active" || raw === "suspended" || raw === "banned" || raw === "all") {
    return raw;
  }
  return "all";
}

export default function GuestsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-nexa-ink-4">Loading…</p>}>
      <GuestsPageInner />
    </Suspense>
  );
}

function GuestsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const personId = searchParams.get("person");
  const tab = searchParams.get("tab");
  const filter = normalizeGuestFilter(searchParams.get("status"));
  const q = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(q);
  const [acting, setActing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    user: AppUser;
    next: "SUSPENDED" | "ACTIVE";
  } | null>(null);

  const { data: users, loading, error, reload } = useAsyncList(fetchUsers, []);

  const replaceParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `/guests?${qs}` : "/guests");
    },
    [router, searchParams],
  );

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput === q) return;
      replaceParams({ q: searchInput || null });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput, q, replaceParams]);

  const guests = useMemo(
    () => users.filter((u) => u.role === "guest" || u.role === "both"),
    [users],
  );

  const counts = useMemo(
    () => ({
      all: guests.length,
      active: guests.filter((u) => u.status === "active" || u.status === "pending").length,
      suspended: guests.filter((u) => u.status === "suspended").length,
      banned: guests.filter((u) => u.status === "banned").length,
    }),
    [guests],
  );

  const filtered = guests.filter((u) => {
    const matchFilter =
      filter === "all"
        ? true
        : u.status === filter || (filter === "active" && u.status === "pending");
    const needle = searchInput.toLowerCase();
    const matchQuery =
      !needle ||
      u.name.toLowerCase().includes(needle) ||
      u.email.toLowerCase().includes(needle) ||
      u.phone.toLowerCase().includes(needle);
    return matchFilter && matchQuery;
  });

  const selectedUser = useMemo(
    () => (personId ? users.find((u) => u.id === personId) ?? null : null),
    [users, personId],
  );

  const onTabChange = useCallback(
    (next: PersonTab) => {
      replaceParams({ tab: next });
    },
    [replaceParams],
  );

  async function confirmGuestStatus() {
    if (!confirm) return;
    const { user, next } = confirm;
    setActing(user.id);
    try {
      await updateUserAccountStatus(user.id, next);
      setConfirm(null);
      await reload();
    } finally {
      setActing(null);
    }
  }

  const hasSelection = Boolean(personId);
  const canSuspend =
    selectedUser?.status === "active" || selectedUser?.status === "pending";
  const canReactivate =
    selectedUser?.status === "suspended" || selectedUser?.status === "banned";

  return (
    <PageShell variant="workspace">
      <div className="shrink-0 border-b border-nexa-line bg-white px-4 py-3 sm:px-6">
        <PageToolbar
          className={hasSelection ? "hidden lg:flex" : undefined}
          filters={
            <FilterTabs<Filter>
              value={filter}
              onChange={(next) => replaceParams({ status: next === "all" ? null : next })}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "active", label: "Active", count: counts.active },
                { value: "suspended", label: "Suspended", count: counts.suspended },
                { value: "banned", label: "Banned", count: counts.banned },
              ]}
            />
          }
          trailing={
            <div className="flex items-center gap-2">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search name or email…"
                className="w-full md:w-64"
              />
              <Button size="sm" variant="outline" onClick={() => void reload()} disabled={loading}>
                Refresh
              </Button>
            </div>
          }
        />
        {error ? (
          <ErrorState
            className="mt-3"
            title="Failed to load guests"
            detail={error}
            onRetry={() => void reload()}
          />
        ) : null}
      </div>

      <MasterDetail
        splitAt="lg"
        hasSelection={hasSelection}
        onBack={() => replaceParams({ person: null, tab: null })}
        backLabel="Back to Guests"
        list={
          <div className="flex min-h-0 flex-1 flex-col bg-nexa-bg">
            {loading && guests.length === 0 ? (
              <LoadingState label="Loading guests…" />
            ) : !loading && filtered.length === 0 ? (
              <EmptyState icon={Users} title="No guests found." />
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="hidden lg:block">
                  {filtered.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() =>
                        replaceParams({
                          person: user.id,
                          tab: tab || "travel",
                        })
                      }
                      className={`block w-full border-b border-nexa-line px-4 py-3 text-left hover:bg-nexa-bg-2 ${
                        personId === user.id ? "bg-nexa-primary-soft" : "bg-white"
                      }`}
                    >
                      <GuestRow user={user} />
                    </button>
                  ))}
                </div>
                <div className="space-y-2 p-3 lg:hidden">
                  {filtered.map((user) => (
                    <CollectionCard
                      key={user.id}
                      selected={personId === user.id}
                      onClick={() =>
                        replaceParams({
                          person: user.id,
                          tab: tab || "travel",
                        })
                      }
                    >
                      <GuestRow user={user} />
                    </CollectionCard>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
        workspace={
          personId ? (
            <Person360Workspace
              key={personId}
              userId={personId}
              tab={tab}
              defaultTab="travel"
              onTabChange={onTabChange}
              fallbackName={selectedUser?.name}
              fallbackEmail={selectedUser?.email}
              fallbackAvatarColor={selectedUser?.avatarColor}
              actions={
                selectedUser ? (
                  <>
                    {canSuspend ? (
                      <Button
                        size="sm"
                        variant="danger-outline"
                        className="w-full justify-start"
                        disabled={acting === selectedUser.id}
                        onClick={() => setConfirm({ user: selectedUser, next: "SUSPENDED" })}
                      >
                        <Ban className="h-4 w-4" /> Suspend
                      </Button>
                    ) : null}
                    {canReactivate ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={acting === selectedUser.id}
                        onClick={() => setConfirm({ user: selectedUser, next: "ACTIVE" })}
                      >
                        <RotateCcw className="h-4 w-4" /> Reactivate
                      </Button>
                    ) : null}
                  </>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              className="h-full"
              icon={Users}
              title="Select a guest"
              description="Open a person from the list to see identity, travel, and trust."
            />
          )
        }
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.next === "SUSPENDED" ? "Suspend guest?" : "Reactivate guest?"}
        description={
          confirm?.next === "SUSPENDED"
            ? `${confirm.user.name} will be marked SUSPENDED in Identity.`
            : `${confirm?.user.name} will be restored to ACTIVE status.`
        }
        confirmLabel={confirm?.next === "SUSPENDED" ? "Suspend" : "Reactivate"}
        danger={confirm?.next === "SUSPENDED"}
        busy={Boolean(confirm && acting === confirm.user.id)}
        onConfirm={() => void confirmGuestStatus()}
        onCancel={() => setConfirm(null)}
      />
    </PageShell>
  );
}

function GuestRow({ user }: { user: AppUser }) {
  return (
    <div className="flex items-start gap-3">
      <Avatar name={user.name} color={user.avatarColor} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-nexa-ink">{user.name}</p>
        <p className="truncate text-xs text-nexa-ink-4">{user.email}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={user.status} />
            {user.hostProfileId ? (
              <Badge variant="primary">Host</Badge>
            ) : null}
          </div>
          <span className="text-[11px] text-nexa-ink-4">
            {user.joinedAt ? formatDate(user.joinedAt) : "Not collected"}
          </span>
        </div>
      </div>
    </div>
  );
}
