import {
  LayoutDashboard,
  Home,
  Users,
  CalendarCheck,
  Star,
  BarChart3,
  ShieldAlert,
  BadgeCheck,
  LifeBuoy,
  Settings,
  UserCog,
  ScrollText,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
}

export const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Listings", href: "/listings", icon: Home, badgeKey: "pendingListings" },
  { label: "Users", href: "/users", icon: Users },
  {
    label: "Host Applications",
    href: "/host-applications",
    icon: UserCheck,
    badgeKey: "pendingHostVerification",
  },
  { label: "Bookings", href: "/bookings", icon: CalendarCheck },
  { label: "Reviews", href: "/reviews", icon: Star },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Moderation", href: "/moderation", icon: ShieldAlert, badgeKey: "openRisks" },
  { label: "KYC / Verification", href: "/kyc", icon: BadgeCheck, badgeKey: "pendingKyc" },
  { label: "Support", href: "/support", icon: LifeBuoy, badgeKey: "openTickets" },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Roles & Permissions", href: "/roles", icon: UserCog },
  { label: "Audit Logs", href: "/audit-logs", icon: ScrollText },
];
