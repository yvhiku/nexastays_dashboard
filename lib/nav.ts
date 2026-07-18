import {
  LayoutDashboard,
  Inbox,
  Home,
  Users,
  CalendarCheck,
  BarChart3,
  BadgeCheck,
  Settings,
  ScrollText,
  Star,
  ShieldAlert,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
  /** Hide from sidebar when badge count is 0 (e.g. Moderation stub). */
  hideWhenBadgeZero?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export type NavEntry =
  | { type: "link"; item: NavItem }
  | { type: "group"; group: NavGroup };

export const navEntries: NavEntry[] = [
  {
    type: "link",
    item: { label: "Overview", href: "/", icon: LayoutDashboard },
  },
  {
    type: "link",
    item: {
      label: "Operations",
      href: "/operations",
      icon: Inbox,
      badgeKey: "opsAttention",
    },
  },
  {
    type: "link",
    item: {
      label: "Listings",
      href: "/listings",
      icon: Home,
      badgeKey: "pendingListings",
    },
  },
  {
    type: "link",
    item: { label: "Bookings", href: "/bookings", icon: CalendarCheck },
  },
  {
    type: "link",
    item: {
      label: "Hosts",
      href: "/hosts",
      icon: UserCheck,
      badgeKey: "pendingHostVerification",
    },
  },
  {
    type: "link",
    item: { label: "Guests", href: "/guests", icon: Users },
  },
  {
    type: "group",
    group: {
      label: "Trust & Safety",
      items: [
        {
          label: "KYC",
          href: "/kyc",
          icon: BadgeCheck,
          badgeKey: "pendingKyc",
        },
        {
          label: "Reviews",
          href: "/reviews",
          icon: Star,
        },
        {
          label: "Moderation",
          href: "/moderation",
          icon: ShieldAlert,
          badgeKey: "openRisks",
          hideWhenBadgeZero: true,
        },
        {
          label: "Audit Logs",
          href: "/audit-logs",
          icon: ScrollText,
        },
      ],
    },
  },
  {
    type: "link",
    item: { label: "Analytics", href: "/analytics", icon: BarChart3 },
  },
  {
    type: "link",
    item: { label: "Settings", href: "/settings", icon: Settings },
  },
];

/** Flat list for path matching helpers. */
export const navItems: NavItem[] = navEntries.flatMap((e) =>
  e.type === "link" ? [e.item] : e.group.items,
);
