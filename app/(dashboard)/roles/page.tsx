"use client";

import { Check, Minus, UserCog } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { roles } from "@/lib/mock-data";

const MODULES = [
  "Listings",
  "Users",
  "Bookings",
  "Reviews",
  "Moderation",
  "Support",
  "Analytics",
  "Settings",
];
const ACTIONS = ["view", "edit", "delete", "approve"] as const;

export default function RolesPage() {
  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Role-based access control to scale your team safely."
        actions={<Button size="sm">Create role</Button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex items-start justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-nexa-primary-soft text-nexa-primary">
                <UserCog className="h-5 w-5" />
              </span>
              <Badge variant="neutral">{r.members} members</Badge>
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-nexa-ink">{r.name}</h3>
            <p className="mt-1 text-sm text-nexa-ink-3">{r.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.keys(r.permissions).map((m) => (
                <Badge key={m} variant="primary">{m}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>Permission matrix</CardTitle>
            <CardDescription>View / edit / delete / approve controls per module</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <THead>
              <tr>
                <TH>Module</TH>
                {roles.map((r) => (
                  <TH key={r.id} className="text-center">{r.name}</TH>
                ))}
              </tr>
            </THead>
            <tbody>
              {MODULES.map((m) => (
                <TR key={m}>
                  <TD className="font-medium text-nexa-ink">{m}</TD>
                  {roles.map((r) => {
                    const perms = r.permissions[m];
                    return (
                      <TD key={r.id} className="text-center">
                        {perms && perms.length > 0 ? (
                          <div className="flex flex-wrap justify-center gap-1">
                            {ACTIONS.map((a) =>
                              perms.includes(a) ? (
                                <span
                                  key={a}
                                  title={a}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded bg-nexa-success-soft text-nexa-success"
                                >
                                  <Check className="h-3 w-3" />
                                </span>
                              ) : (
                                <span
                                  key={a}
                                  title={a}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded bg-nexa-bg-2 text-nexa-ink-4"
                                >
                                  <Minus className="h-3 w-3" />
                                </span>
                              ),
                            )}
                          </div>
                        ) : (
                          <span className="text-nexa-ink-4">—</span>
                        )}
                      </TD>
                    );
                  })}
                </TR>
              ))}
            </tbody>
          </Table>
          <p className="px-4 pt-3 text-xs text-nexa-ink-4">
            Order per role: view · edit · delete · approve
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
