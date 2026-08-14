"use client";

import { useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { AdminUserDetail } from "@/lib/api/users-admin";
import type { StaysPersonOverview } from "@/lib/api/stays-admin";
import { collected } from "./person-display";
import { PersonRoleBadges } from "./person-role-badges";

function accountStatus(identity: AdminUserDetail | null): string {
  const raw = identity?.accountStatus?.toLowerCase() ?? "";
  if (raw === "active") return "active";
  if (raw === "suspended" || raw === "frozen") return "suspended";
  if (raw === "banned" || raw === "blocked" || raw === "terminated") return "banned";
  if (raw === "pending") return "pending";
  return raw || "pending";
}

export function Person360Header({
  identity,
  stays,
  fallbackName,
  fallbackEmail,
  fallbackAvatarColor,
  actions,
}: {
  identity: AdminUserDetail | null;
  stays: StaysPersonOverview | null;
  fallbackName?: string;
  fallbackEmail?: string;
  fallbackAvatarColor?: string;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const name =
    identity?.fullName?.trim() ||
    fallbackName ||
    identity?.email ||
    identity?.id ||
    "Person";
  const email = identity?.email ?? fallbackEmail ?? null;
  const phone = identity?.phoneNumber ?? identity?.phones.find((p) => p.isPrimary)?.phoneNumber;
  const photo =
    identity?.profilePhotoUrl && /^https?:\/\//i.test(identity.profilePhotoUrl)
      ? identity.profilePhotoUrl
      : null;
  const joined = identity?.createdAt;

  return (
    <div className="flex items-start justify-between gap-3 border-b border-nexa-line px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <Avatar name={name} color={fallbackAvatarColor} size="lg" />
        )}
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-semibold text-nexa-ink">
            {name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <PersonRoleBadges stays={stays} />
            {identity ? <StatusBadge status={accountStatus(identity)} /> : null}
          </div>
          <p className="mt-1 truncate text-sm text-nexa-ink-3">{collected(email)}</p>
          {phone ? <p className="truncate text-sm text-nexa-ink-4">{phone}</p> : null}
          {joined ? (
            <p className="mt-1 text-xs text-nexa-ink-4">Joined {formatDate(joined)}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="relative shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <MoreHorizontal className="h-4 w-4" />
            Actions
          </Button>
          {open ? (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-nexa-line bg-white p-2 shadow-nexa-lg">
              <div className="flex flex-col gap-1.5" onClick={() => setOpen(false)}>
                {actions}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
