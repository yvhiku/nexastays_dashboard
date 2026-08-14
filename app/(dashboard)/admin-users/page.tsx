"use client";

import { useMemo, useState } from "react";
import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/components/providers/auth-provider";
import {
  createSupportAgent,
  fetchStaffAccounts,
  updateStaffRole,
  type StaffAccount,
  type StaffRole,
} from "@/lib/api/identity-admin";
import {
  fetchSupportAgentWorkload,
  type SupportAgentWorkload,
} from "@/lib/api/stays-admin";
import { useAsyncList } from "@/lib/hooks/use-async-data";
import { isSuperAdmin } from "@/lib/rbac";

const ROLE_CATALOG = [
  {
    id: "ADMIN",
    name: "Super Admin",
    description: "Full dashboard and admin APIs. Live.",
    live: true,
  },
  {
    id: "SUPPORT_AGENT",
    name: "Support Agent",
    description: "Support inbox for assigned tickets. Super Admins assign work from Support.",
    live: true,
  },
  {
    id: "OPERATIONS",
    name: "Operations",
    description: "Listings, bookings, hosts, guests.",
    live: false,
  },
  {
    id: "FINANCE",
    name: "Finance",
    description: "Payments, refunds, payouts.",
    live: false,
  },
  {
    id: "KYC",
    name: "KYC Agent",
    description: "Identity verification only.",
    live: false,
  },
  {
    id: "CONTENT",
    name: "Content Manager",
    description: "CMS and listing content (P1).",
    live: false,
  },
  {
    id: "MODERATOR",
    name: "Moderator",
    description: "Reviews and reports.",
    live: false,
  },
] as const;

function roleLabel(role: StaffRole) {
  return role === "SUPPORT_AGENT" ? "Support Agent" : "Super Admin";
}

function WorkloadStats({ row }: { row?: SupportAgentWorkload }) {
  const stats = [
    { label: "Assigned", value: row?.assigned ?? 0 },
    { label: "Open", value: row?.open ?? 0 },
    { label: "In progress", value: row?.inProgress ?? 0 },
    { label: "Waiting", value: row?.waiting ?? 0 },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-md bg-nexa-bg-2 px-2 py-1.5">
          <p className="text-sm font-semibold text-nexa-ink">{stat.value}</p>
          <p className="text-[10px] text-nexa-ink-4">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  const { session } = useAuth();
  const canManage = isSuperAdmin(session);
  const { data: staff, loading, error, reload } = useAsyncList(fetchStaffAccounts, []);
  const { data: workload } = useAsyncList(
    () => (canManage ? fetchSupportAgentWorkload() : Promise.resolve([])),
    [canManage],
  );
  const [pending, setPending] = useState<{
    user: StaffAccount;
    next: StaffRole;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createNotice, setCreateNotice] = useState<string | null>(null);

  const roles = session?.roles?.length
    ? session.roles
    : session?.role
      ? [session.role]
      : ["ADMIN"];

  const sortedStaff = useMemo(
    () =>
      [...staff].sort((a, b) =>
        (a.email ?? a.id).localeCompare(b.email ?? b.id),
      ),
    [staff],
  );
  const superAdmins = sortedStaff.filter((user) => user.staffRole === "ADMIN");
  const supportAgents = sortedStaff.filter((user) => user.staffRole === "SUPPORT_AGENT");
  const workloadById = useMemo(
    () => new Map(workload.map((row) => [row.agentId, row])),
    [workload],
  );

  async function confirmRoleChange() {
    if (!pending) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateStaffRole(pending.user.id, pending.next);
      setPending(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to change staff role.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateAgent(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateNotice(null);
    if (password !== confirmPassword) {
      setCreateError("Passwords do not match.");
      return;
    }
    if (password.length < 10) {
      setCreateError("Password must be at least 10 characters.");
      return;
    }
    setCreating(true);
    try {
      const created = await createSupportAgent({
        email,
        fullName,
        password,
      });
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setCreateNotice(
        `Give ${created.email} and that password to the agent. They sign in at /login and only see Support.`,
      );
      await reload();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Unable to create support agent.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Admin Users"
        description="Signed-in identity from Identity session. Super Admins can set live staff roles."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current session</CardTitle>
          <CardDescription>Loaded from GET /auth/session — not hardcoded.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-nexa-ink-4">Name</p>
            <p className="font-medium text-nexa-ink">{session?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-nexa-ink-4">Email</p>
            <p className="font-medium text-nexa-ink">{session?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-nexa-ink-4">User ID</p>
            <p className="font-medium text-nexa-ink">{session?.userId ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-nexa-ink-4">Roles</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {roles.map((r) => (
                <Badge key={r} variant="primary">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Support Agent</CardTitle>
            <CardDescription>
              Provision an agent with their own email and password. Hand those
              credentials to the agent — they use the same /login and only see Support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {createError && (
              <ErrorState className="mb-4" title="Could not create agent" detail={createError} />
            )}
            {createNotice && (
              <p className="mb-4 rounded-md bg-nexa-success-soft px-3 py-2 text-sm text-nexa-success">
                {createNotice}
              </p>
            )}
            <form onSubmit={(e) => void onCreateAgent(e)} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-nexa-ink-3">Full name</span>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-nexa-line px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-nexa-ink-3">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-nexa-line px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-nexa-ink-3">Password</span>
                <input
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-nexa-line px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-nexa-ink-3">Confirm password</span>
                <input
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-nexa-line px-3 py-2 text-sm"
                />
              </label>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create Support Agent"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Staff roles</CardTitle>
            <CardDescription>
              Changing a role invalidates that person&apos;s outstanding access tokens.
              Tickets stay assigned when a role or freeze changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <ErrorState className="mb-4" title="Failed to load staff" detail={error} />
            )}
            {actionError && (
              <ErrorState className="mb-4" title="Role change failed" detail={actionError} />
            )}
            {loading && staff.length === 0 ? (
              <LoadingState label="Loading staff accounts…" />
            ) : sortedStaff.length === 0 ? (
              <EmptyState title="No staff accounts" description="ADMIN accounts will appear here." />
            ) : (
              <div className="space-y-8">
                <StaffGroup
                  title="Super Admins"
                  empty="No Super Admins."
                  users={superAdmins}
                  sessionUserId={session?.userId}
                  busy={busy}
                  onRoleChange={(user, next) => setPending({ user, next })}
                />
                <StaffGroup
                  title="Support Agents"
                  empty="No Support Agents."
                  users={supportAgents}
                  sessionUserId={session?.userId}
                  busy={busy}
                  workloadById={workloadById}
                  onRoleChange={(user, next) => setPending({ user, next })}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 font-display text-lg font-semibold text-nexa-ink">
        Role catalog
      </h2>
      <p className="mb-4 text-sm text-nexa-ink-3">
        Super Admin and Support Agent are live staff roles. Other catalog entries remain
        documentation until later phases.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ROLE_CATALOG.map((role) => (
          <Card key={role.id} className="p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-nexa-primary-soft text-nexa-primary">
              <UserCog className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-display text-lg font-semibold text-nexa-ink">
              {role.name}
            </h3>
            <p className="mt-1 text-sm text-nexa-ink-3">{role.description}</p>
            <Badge variant={role.live ? "primary" : "neutral"} className="mt-3">
              {role.live ? "Live" : role.id}
            </Badge>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title="Change staff role?"
        description={
          pending
            ? `Set ${pending.user.email ?? pending.user.id} to ${roleLabel(pending.next)}. Their current session will be revoked.`
            : undefined
        }
        confirmLabel="Change role"
        busy={busy}
        onConfirm={() => void confirmRoleChange()}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
      />
    </div>
  );
}

function StaffGroup({
  title,
  empty,
  users,
  sessionUserId,
  busy,
  workloadById,
  onRoleChange,
}: {
  title: string;
  empty: string;
  users: StaffAccount[];
  sessionUserId?: string;
  busy: boolean;
  workloadById?: Map<string, SupportAgentWorkload>;
  onRoleChange: (user: StaffAccount, next: StaffRole) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-nexa-ink">{title}</h3>
      {users.length === 0 ? (
        <p className="text-sm text-nexa-ink-4">{empty}</p>
      ) : (
        <div className="divide-y divide-nexa-line">
          {users.map((user) => {
            const isSelf = user.id === sessionUserId;
            const name = user.fullName || user.email || user.id;
            const showWorkload = Boolean(workloadById);
            return (
              <div key={user.id} className="flex flex-col gap-3 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    {showWorkload ? <Avatar name={name} size="sm" /> : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-nexa-ink">{name}</p>
                      <p className="truncate text-xs text-nexa-ink-4">
                        {user.email ?? user.id}
                        {isSelf ? " · you" : ""}
                        {` · ${user.accountStatus}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.staffRole === "ADMIN" ? "primary" : "neutral"}>
                      {roleLabel(user.staffRole)}
                    </Badge>
                    <select
                      className="h-8 rounded-md border border-nexa-line bg-white px-2 text-xs"
                      value={user.staffRole}
                      disabled={isSelf || busy}
                      onChange={(e) => {
                        const next = e.target.value as StaffRole;
                        if (next === user.staffRole) return;
                        onRoleChange(user, next);
                      }}
                      aria-label={`Staff role for ${user.email ?? user.id}`}
                    >
                      <option value="ADMIN">Super Admin</option>
                      <option value="SUPPORT_AGENT">Support Agent</option>
                    </select>
                  </div>
                </div>
                {showWorkload ? <WorkloadStats row={workloadById?.get(user.id)} /> : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
