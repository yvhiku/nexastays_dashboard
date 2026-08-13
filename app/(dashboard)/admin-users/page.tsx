"use client";

import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";

const ROLE_CATALOG = [
  {
    id: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Everything. Use sparingly.",
  },
  {
    id: "OPERATIONS",
    name: "Operations",
    description: "Listings, bookings, hosts, guests.",
  },
  {
    id: "SUPPORT",
    name: "Support Agent",
    description: "Tickets, guests, hosts, bookings.",
  },
  {
    id: "FINANCE",
    name: "Finance",
    description: "Payments, refunds, payouts.",
  },
  {
    id: "KYC",
    name: "KYC Agent",
    description: "Identity verification only.",
  },
  {
    id: "CONTENT",
    name: "Content Manager",
    description: "CMS and listing content (P1).",
  },
  {
    id: "MODERATOR",
    name: "Moderator",
    description: "Reviews and reports.",
  },
] as const;

export default function AdminUsersPage() {
  const { session } = useAuth();
  const roles = session?.roles?.length
    ? session.roles
    : session?.role
      ? [session.role]
      : ["ADMIN"];

  return (
    <div>
      <PageHeader
        title="Admin Users"
        description="Signed-in identity from Identity session. Full RBAC administration is not in this launch."
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

      <h2 className="mb-3 font-display text-lg font-semibold text-nexa-ink">
        Target role catalog
      </h2>
      <p className="mb-4 text-sm text-nexa-ink-3">
        Documented roles for when Identity returns roles[]. Today every admin is effectively
        ADMIN, so all P0 nav groups stay visible. This is not a live permission matrix.
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
            <Badge variant="neutral" className="mt-3">
              {role.id}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
