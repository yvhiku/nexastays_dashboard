"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { navEntries, navPathMatches, type NavGroup, type NavItem } from "@/lib/nav";
import { fetchStats, EMPTY_DASHBOARD_STATS } from "@/lib/api/stays-admin";
import { cn, initials } from "@/lib/utils";
import { useAsyncStats } from "@/lib/hooks/use-async-data";
import { useAuth } from "@/components/providers/auth-provider";
import {
  filterNavEntries,
  getDefaultDashboardRoute,
  isSupportAgent,
} from "@/lib/rbac";

function pathMatches(href: string, pathname: string) {
  return navPathMatches(href, pathname);
}

function groupContainsPath(group: NavGroup, pathname: string) {
  return group.items.some((i) => pathMatches(i.href, pathname));
}

function NavLink({
  item,
  pathname,
  metrics,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  metrics: Record<string, number>;
  onNavigate: () => void;
}) {
  const active = pathMatches(item.href, pathname);
  const Icon = item.icon;
  const badge = item.badgeKey ? metrics[item.badgeKey] : undefined;
  if (item.hideWhenBadgeZero && (!badge || badge <= 0)) return null;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-nexa-primary-soft text-nexa-primary-dark"
          : "text-nexa-ink-3 hover:bg-nexa-bg-2 hover:text-nexa-ink",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-nexa-primary" : "text-nexa-ink-4 group-hover:text-nexa-ink-2",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            active
              ? "bg-nexa-primary text-white"
              : "bg-nexa-primary-soft text-nexa-primary-dark",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const agent = isSupportAgent(session);
  const { data: stats } = useAsyncStats(
    agent ? async () => EMPTY_DASHBOARD_STATS : fetchStats,
    EMPTY_DASHBOARD_STATS,
    [agent],
  );
  const metrics = stats as unknown as Record<string, number>;
  const visibleNav = filterNavEntries(navEntries, session);

  const displayName = session?.name?.trim() || (agent ? "Support" : "Admin");
  const displayEmail = session?.email?.trim() || session?.userId?.slice(0, 8) || "Signed in";
  const displayRole = session?.staffRole || session?.roles?.[0] || session?.role || "ADMIN";
  const homeHref = getDefaultDashboardRoute(session);

  function isGroupOpen(group: NavGroup) {
    if (openGroups[group.label] !== undefined) return openGroups[group.label];
    return groupContainsPath(group, pathname);
  }

  const nav = (
    <nav className="flex flex-col gap-0.5 px-3">
      {visibleNav.map((entry) => {
        if (entry.type === "link") {
          return (
            <NavLink
              key={entry.item.href}
              item={entry.item}
              pathname={pathname}
              metrics={metrics}
              onNavigate={() => setOpen(false)}
            />
          );
        }
        const { group } = entry;
        const groupActive = groupContainsPath(group, pathname);
        const expanded = isGroupOpen(group);
        return (
          <div key={group.label} className="mt-2">
            <button
              type="button"
              onClick={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [group.label]: !expanded,
                }))
              }
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-wide",
                groupActive ? "text-nexa-primary" : "text-nexa-ink-4",
              )}
            >
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  expanded ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>
            {expanded && (
              <div className="ml-1 flex flex-col gap-0.5 border-l border-nexa-line pl-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    metrics={metrics}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 lg:hidden rounded-md border border-nexa-line bg-white p-2 shadow-nexa-sm"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-nexa-ink-2" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-nexa-ink/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-nexa-line bg-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-nexa-line">
          <Link href={homeHref} className="flex items-center gap-2.5">
            <Image
              src="/images/nexastays.png"
              alt="Nexa Stays"
              width={34}
              height={34}
              className="rounded-md"
            />
            <div className="leading-tight">
              <p className="font-display text-base font-semibold text-nexa-ink">
                Nexa Stays
              </p>
              <p className="text-[11px] font-medium text-nexa-primary">
                {agent ? "Support" : "Operations"}
              </p>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-nexa-ink-3"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 nexa-scrollbar-thin">{nav}</div>

        <div className="border-t border-nexa-line p-3">
          <div className="flex items-center gap-3 rounded-md bg-nexa-bg-2 px-3 py-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-nexa-primary text-sm font-semibold text-white">
              {initials(displayName) || "AD"}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-nexa-ink">
                {displayName}
              </p>
              <p className="truncate text-xs text-nexa-ink-4">
                {displayRole.replace(/_/g, " ")} · {displayEmail}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
