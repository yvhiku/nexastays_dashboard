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
  Wallet,
  RotateCcw,
  LifeBuoy,
  UserCog,
  Gauge,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
  /** Hide from sidebar when badge count is 0 (e.g. empty stub queues). */
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
    type: "group",
    group: {
      label: "Operations",
      items: [
        {
          label: "Inbox",
          href: "/operations",
          icon: Inbox,
          badgeKey: "opsAttention",
        },
        { label: "Bookings", href: "/bookings", icon: CalendarCheck },
        {
          label: "Listings",
          href: "/listings",
          icon: Home,
          badgeKey: "pendingListings",
        },
        {
          label: "Hosts",
          href: "/hosts",
          icon: UserCheck,
          badgeKey: "pendingHostVerification",
        },
        { label: "Guests", href: "/guests", icon: Users },
      ],
    },
  },
  {
    type: "group",
    group: {
      label: "Finance",
      items: [
        { label: "Payments", href: "/payments", icon: Wallet },
        { label: "Refunds", href: "/refunds", icon: RotateCcw },
      ],
    },
  },
  {
    type: "group",
    group: {
      label: "Support",
      items: [
        {
          label: "Tickets",
          href: "/support",
          icon: LifeBuoy,
          badgeKey: "openTickets",
        },
        {
          label: "Operations",
          href: "/support/operations",
          icon: Gauge,
        },
        {
          label: "Support analytics",
          href: "/support/analytics",
          icon: BarChart3,
        },
      ],
    },
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
        { label: "Reports", href: "/reports", icon: ShieldAlert },
        { label: "Reviews", href: "/reviews", icon: Star },
        { label: "Audit Logs", href: "/audit-logs", icon: ScrollText },
      ],
    },
  },
  {
    type: "group",
    group: {
      label: "System",
      items: [
        { label: "Admin Users", href: "/admin-users", icon: UserCog },
        { label: "Settings", href: "/settings", icon: Settings },
      ],
    },
  },
  {
    type: "link",
    item: { label: "Analytics", href: "/analytics", icon: BarChart3 },
  },
];

/** Flat list for path matching helpers. */
export const navItems: NavItem[] = navEntries.flatMap((e) =>
  e.type === "link" ? [e.item] : e.group.items,
);
