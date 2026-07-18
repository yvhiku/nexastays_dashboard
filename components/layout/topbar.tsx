"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { navItems } from "@/lib/nav";
import { useAuth } from "@/components/providers/auth-provider";
import { OperationsInbox } from "@/components/layout/operations-inbox";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [search, setSearch] = useState("");

  const current =
    navItems.find((n) =>
      n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
    )?.label ?? "Overview";

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) {
      router.push("/listings?status=all");
      return;
    }
    router.push(`/listings?status=all&q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-nexa-line bg-nexa-bg/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 pl-10 lg:pl-0">
        <span className="text-sm text-nexa-ink-4">Nexa Stays</span>
        <span className="text-nexa-ink-4">/</span>
        <span className="text-sm font-medium text-nexa-ink">{current}</span>
      </div>

      <form
        onSubmit={onSearchSubmit}
        className="ml-auto hidden md:flex relative w-80"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nexa-ink-4" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search listings by title, city, or host…"
          className="h-9 w-full rounded-md border border-nexa-line bg-white pl-9 pr-3 text-sm placeholder:text-nexa-ink-4 focus:outline-none focus:ring-2 focus:ring-nexa-primary/30"
          aria-label="Search listings"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <OperationsInbox />
        <button
          type="button"
          onClick={logout}
          className="rounded-md p-2 text-nexa-ink-3 hover:bg-nexa-bg-2"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
