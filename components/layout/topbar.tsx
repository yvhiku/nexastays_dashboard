"use client";

import { usePathname } from "next/navigation";
import { Bell, LogOut, Search, Sun } from "lucide-react";
import { navItems } from "@/lib/nav";
import { useAuth } from "@/components/providers/auth-provider";

export function Topbar() {
  const pathname = usePathname();
  const { logout } = useAuth();  const current =
    navItems.find((n) =>
      n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
    )?.label ?? "Overview";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-nexa-line bg-nexa-bg/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 pl-10 lg:pl-0">
        <span className="text-sm text-nexa-ink-4">Nexa Stays</span>
        <span className="text-nexa-ink-4">/</span>
        <span className="text-sm font-medium text-nexa-ink">{current}</span>
      </div>

      <div className="ml-auto hidden md:flex relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-nexa-ink-4" />
        <input
          placeholder="Search users, listings, bookings…"
          className="h-9 w-full rounded-md border border-nexa-line bg-white pl-9 pr-3 text-sm placeholder:text-nexa-ink-4 focus:outline-none focus:ring-2 focus:ring-nexa-primary/30"
        />
      </div>

      <div className="ml-auto md:ml-0 flex items-center gap-1">
        <button className="relative rounded-md p-2 text-nexa-ink-3 hover:bg-nexa-bg-2">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-nexa-primary ring-2 ring-nexa-bg" />
        </button>
        <button className="rounded-md p-2 text-nexa-ink-3 hover:bg-nexa-bg-2">
          <Sun className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={logout}
          className="rounded-md p-2 text-nexa-ink-3 hover:bg-nexa-bg-2"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>      </div>
    </header>
  );
}
