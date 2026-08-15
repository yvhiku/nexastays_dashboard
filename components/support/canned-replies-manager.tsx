"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createCannedReply,
  deactivateCannedReply,
  fetchCannedReplies,
  patchCannedReply,
} from "@/lib/api/stays-admin";
import type { CannedReply, TicketCategory } from "@/lib/types";

const CATEGORIES: Array<TicketCategory | ""> = [
  "",
  "BOOKING",
  "PAYMENT",
  "REFUND",
  "CANCELLATION",
  "HOST",
  "GUEST",
  "LISTING",
  "KYC",
  "TECHNICAL",
  "FRAUD",
  "OTHER",
];

export function CannedRepliesManager() {
  const [rows, setRows] = useState<CannedReply[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setRows(await fetchCannedReplies(true));
  }

  useEffect(() => {
    void reload().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load replies"),
    );
  }, []);

  async function create() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCannedReply({
        title: title.trim(),
        body: body.trim(),
        category: category || null,
        language: language || null,
      });
      setTitle("");
      setBody("");
      setCategory("");
      setLanguage("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-xs text-nexa-danger">{error}</p> : null}
      <div className="grid gap-2 md:grid-cols-2">
        <input
          className="h-8 rounded-md border border-nexa-line px-2 text-xs"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex gap-2">
          <select
            className="h-8 flex-1 rounded-md border border-nexa-line px-2 text-xs"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Canned reply category"
          >
            <option value="">GENERAL category</option>
            {CATEGORIES.filter(Boolean).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className="h-8 w-28 rounded-md border border-nexa-line px-2 text-xs"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Canned reply language"
          >
            <option value="">GENERAL</option>
            <option value="ar">ar</option>
            <option value="fr">fr</option>
            <option value="en">en</option>
          </select>
        </div>
        <textarea
          className="min-h-[72px] rounded-md border border-nexa-line px-2 py-1 text-xs md:col-span-2"
          placeholder="Body. Variables: {{customer_name}} {{ticket_number}} {{booking_reference}} {{listing_name}}"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button size="sm" disabled={busy || !title.trim() || !body.trim()} onClick={() => void create()}>
          Save reply
        </Button>
      </div>
      <ul className="divide-y divide-nexa-line">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm text-nexa-ink">{row.title}</p>
              <p className="text-[11px] text-nexa-ink-4">
                {row.category ?? "GENERAL"} · {row.language ?? "GENERAL"} ·{" "}
                {row.isActive ? "Active" : "Inactive"}
              </p>
            </div>
            {row.isActive ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void deactivateCannedReply(row.id)
                    .then(reload)
                    .finally(() => setBusy(false));
                }}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void patchCannedReply(row.id, { is_active: true })
                    .then(reload)
                    .finally(() => setBusy(false));
                }}
              >
                Activate
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
