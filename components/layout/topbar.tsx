"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { navItems } from "@/lib/nav";
import { useAuth } from "@/components/providers/auth-provider";
import { OperationsInbox } from "@/components/layout/operations-inbox";
import { globalSearch, type SearchHit } from "@/lib/api/global-search";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  booking: "Booking",
  listing: "Listing",
  host: "Host",
  guest: "Guest",
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const current =
    navItems.find((n) =>
      n.href === "/" ? pathname === "/" : pathname.startsWith(n.href),
    )?.label ?? "Overview";

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setHits([]);
      setError(null);
      return;
    }
    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void globalSearch(q)
        .then((next) => setHits(next))
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Search failed"),
        )
        .finally(() => setLoading(false));
    }, 280);
    return () => window.clearTimeout(handle);
  }, [search]);

  function go(href: string) {
    setOpen(false);
    setSearch("");
    router.push(href);
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    if (hits[0]) {
      go(hits[0].href);
      return;
    }
    go(`/listings?status=all&q=${encodeURIComponent(q)}`);
  }

  const grouped = (["booking", "listing", "host", "guest"] as const)
    .map((kind) => ({ kind, items: hits.filter((h) => h.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-nexa-line bg-nexa-bg/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 pl-10 lg:pl-0">
        <span className="text-sm text-nexa-ink-4">Nexa Stays</span>
        <span className="text-nexa-ink-4">/</span>
        <span className="text-sm font-medium text-nexa-ink">{current}</span>
      </div>

      <div ref={boxRef} className="relative ml-auto hidden w-[28rem] md:block">
        <form onSubmit={onSearchSubmit}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nexa-ink-4" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search Nexa Stays…"
            className="h-9 w-full rounded-md border border-nexa-line bg-white pl-9 pr-3 text-sm placeholder:text-nexa-ink-4 focus:outline-none focus:ring-2 focus:ring-nexa-primary/30"
            aria-label="Search Nexa Stays"
            autoComplete="off"
          />
        </form>
        {open && search.trim().length >= 2 && (
          <div className="absolute z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-md border border-nexa-line bg-white shadow-lg">
            {loading && (
              <p className="flex items-center gap-2 px-3 py-3 text-sm text-nexa-ink-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </p>
            )}
            {error && <p className="px-3 py-3 text-sm text-nexa-danger">{error}</p>}
            {!loading && !error && hits.length === 0 && (
              <p className="px-3 py-3 text-sm text-nexa-ink-4">No matches.</p>
            )}
            {grouped.map((g) => (
              <div key={g.kind} className="border-t border-nexa-line first:border-t-0">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-nexa-ink-4">
                  {KIND_LABEL[g.kind]}
                </p>
                {g.items.map((hit) => (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    onClick={() => go(hit.href)}
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2 text-left hover:bg-nexa-bg-2",
                    )}
                  >
                    <span className="text-sm font-medium text-nexa-ink">{hit.title}</span>
                    <span className="text-xs text-nexa-ink-4">{hit.subtitle}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

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
