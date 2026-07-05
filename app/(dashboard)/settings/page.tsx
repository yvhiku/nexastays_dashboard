"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchFeeSettings,
  updateFeeSettings,
  type FeeSettings,
} from "@/lib/api/stays-admin";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-nexa-primary" : "bg-nexa-line",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-nexa-ink">{label}</label>
      {children}
      {hint && <p className="text-xs text-nexa-ink-4">{hint}</p>}
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-nexa-line bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-nexa-primary/30";

export default function SettingsPage() {
  const [flags, setFlags] = useState({
    instantBook: true,
    guestReviews: true,
    aiDuplicateDetection: false,
    smartPricing: false,
    hostVerificationRequired: true,
  });

  const [guestFee, setGuestFee] = useState("5");
  const [hostFee, setHostFee] = useState("5");
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeMessage, setFeeMessage] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);

  const loadFees = useCallback(async () => {
    setFeeLoading(true);
    setFeeError(null);
    try {
      const settings: FeeSettings = await fetchFeeSettings();
      setGuestFee(String(settings.guest_fee_percent));
      setHostFee(String(settings.host_fee_percent));
    } catch (err) {
      setFeeError(err instanceof Error ? err.message : "Failed to load fee settings");
    } finally {
      setFeeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const totalCommission =
    (Number(guestFee) || 0) + (Number(hostFee) || 0);

  const handleSaveFees = async () => {
    const guest = Number(guestFee);
    const host = Number(hostFee);
    if (!Number.isFinite(guest) || !Number.isFinite(host)) {
      setFeeError("Enter valid numbers for guest and host fees.");
      return;
    }
    if (guest < 0 || guest > 50 || host < 0 || host > 50) {
      setFeeError("Each fee must be between 0% and 50%.");
      return;
    }

    setFeeSaving(true);
    setFeeError(null);
    setFeeMessage(null);
    try {
      const updated = await updateFeeSettings(guest, host);
      setGuestFee(String(updated.guest_fee_percent));
      setHostFee(String(updated.host_fee_percent));
      setFeeMessage(
        `Saved — ${updated.guest_fee_percent}% guest + ${updated.host_fee_percent}% host (${updated.total_commission_percent}% total Nexa revenue).`,
      );
    } catch (err) {
      setFeeError(err instanceof Error ? err.message : "Failed to save fee settings");
    } finally {
      setFeeSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="System Settings"
        description="Platform configuration — commission rates apply to all new bookings on web and mobile."
        actions={
          <Button size="sm" onClick={handleSaveFees} disabled={feeSaving || feeLoading}>
            {feeSaving ? "Saving…" : "Save commission"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Commission & pricing</CardTitle>
              <CardDescription>
                Guest + host service fees (stored in Stays database, used at booking time).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {feeLoading ? (
              <p className="text-sm text-nexa-ink-4">Loading current rates…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Guest service fee" hint="Added to guest checkout total.">
                    <div className="relative">
                      <input
                        value={guestFee}
                        onChange={(e) => setGuestFee(e.target.value)}
                        className={inputCls}
                        inputMode="decimal"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-nexa-ink-4">%</span>
                    </div>
                  </Field>
                  <Field label="Host platform fee" hint="Deducted from host payout.">
                    <div className="relative">
                      <input
                        value={hostFee}
                        onChange={(e) => setHostFee(e.target.value)}
                        className={inputCls}
                        inputMode="decimal"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-nexa-ink-4">%</span>
                    </div>
                  </Field>
                </div>
                <div className="rounded-md bg-nexa-bg-2 px-3 py-2 text-sm text-nexa-ink-3">
                  Total Nexa revenue per booking:{" "}
                  <span className="font-semibold text-nexa-ink">{totalCommission}%</span>
                  {" "}(guest {guestFee || "0"}% + host {hostFee || "0"}%)
                </div>
                {feeMessage && (
                  <p className="text-sm text-green-700">{feeMessage}</p>
                )}
                {feeError && (
                  <p className="text-sm text-red-600">{feeError}</p>
                )}
              </>
            )}
            <Field label="Default currency">
              <select className={inputCls} defaultValue="MAD">
                <option value="MAD">MAD — Moroccan Dirham</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Booking rules</CardTitle>
              <CardDescription>Global constraints for reservations</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Min nights">
                <input defaultValue="1" className={inputCls} />
              </Field>
              <Field label="Max nights">
                <input defaultValue="30" className={inputCls} />
              </Field>
            </div>
            <Field label="Cancellation policy">
              <select className={inputCls} defaultValue="moderate">
                <option value="flexible">Flexible — full refund 24h before</option>
                <option value="moderate">Moderate — full refund 5 days before</option>
                <option value="strict">Strict — 50% refund up to 7 days before</option>
              </select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Listing approval rules</CardTitle>
              <CardDescription>How new listings enter the marketplace</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Approval mode">
              <select className={inputCls} defaultValue="manual">
                <option value="manual">Manual review (recommended)</option>
                <option value="auto_verified">Auto-approve verified hosts</option>
                <option value="auto">Auto-approve all</option>
              </select>
            </Field>
            <Field label="Minimum photos required">
              <input defaultValue="5" className={inputCls} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Feature flags</CardTitle>
              <CardDescription>Enable / disable features and rollout experiments</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-nexa-line">
            {[
              { key: "instantBook", label: "Instant Book", desc: "Allow guests to book without host approval." },
              { key: "guestReviews", label: "Guest reviews", desc: "Enable guests to leave reviews after checkout." },
              { key: "hostVerificationRequired", label: "Require host KYC", desc: "Hosts must pass KYC before listing." },
              { key: "smartPricing", label: "Smart pricing (beta)", desc: "Suggest nightly prices based on demand." },
              { key: "aiDuplicateDetection", label: "AI duplicate detection", desc: "Detect duplicate images across listings." },
            ].map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-nexa-ink">{f.label}</p>
                  <p className="text-xs text-nexa-ink-4">{f.desc}</p>
                </div>
                <Toggle
                  checked={flags[f.key as keyof typeof flags]}
                  onChange={(v) => setFlags((prev) => ({ ...prev, [f.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
