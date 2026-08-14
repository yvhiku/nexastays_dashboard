import type { AdminSession } from "@/lib/api/auth";
import type { NavEntry } from "@/lib/nav";
import { AGENT_PATHS } from "@/lib/dashboard-paths";

function sessionRoles(session: AdminSession | null | undefined): string[] {
  if (!session) return [];
  if (session.roles?.length) return session.roles;
  if (session.role) return [session.role];
  if (session.staffRole) return [session.staffRole];
  return [];
}

export function isSupportAgent(session: AdminSession | null | undefined): boolean {
  const roles = sessionRoles(session);
  return roles.includes("SUPPORT_AGENT") && !roles.includes("ADMIN");
}

export function isSuperAdmin(session: AdminSession | null | undefined): boolean {
  return sessionRoles(session).includes("ADMIN");
}

export function canAccessDashboardPath(
  session: AdminSession | null | undefined,
  pathname: string,
): boolean {
  if (!session) return pathname === "/login";
  if (isSuperAdmin(session)) return true;
  if (!isSupportAgent(session)) return true;
  return AGENT_PATHS.some((path) => pathname === path);
}

export function getDefaultDashboardRoute(
  session: AdminSession | null | undefined,
): string {
  return isSupportAgent(session) ? "/support" : "/";
}

export function filterNavEntries(
  entries: NavEntry[],
  session: AdminSession | null | undefined,
): NavEntry[] {
  if (!isSupportAgent(session)) return entries;
  return entries
    .map((entry) => {
      if (entry.type === "link") {
        return entry.item.href === "/support" ? entry : null;
      }
      const items = entry.group.items.filter((item) => item.href === "/support");
      if (items.length === 0) return null;
      return {
        type: "group" as const,
        group: { label: "Support", items },
      };
    })
    .filter((entry): entry is NavEntry => entry != null);
}
