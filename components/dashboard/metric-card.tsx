import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClientOnly } from "@/components/client-only";
import { Sparkline } from "@/components/charts/charts";

export function MetricCard({
  label,
  value,
  icon: Icon,
  delta,
  spark,
  sparkColor = "#E8507A",
  accent = "primary",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: number;
  spark?: number[];
  sparkColor?: string;
  accent?: "primary" | "accent" | "info" | "success";
}) {
  const accentBg = {
    primary: "bg-nexa-primary-soft text-nexa-primary",
    accent: "bg-nexa-accent-soft text-[#B45309]",
    info: "bg-nexa-info-soft text-nexa-info",
    success: "bg-nexa-success-soft text-nexa-success",
  }[accent];

  const up = (delta ?? 0) >= 0;

  return (
    <div className="nexa-card p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-md", accentBg)}>
          <Icon className="h-5 w-5" />
        </span>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              up ? "text-nexa-success" : "text-nexa-danger",
            )}
          >
            {up ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold text-nexa-ink">{value}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-sm text-nexa-ink-3">{label}</p>
        {spark && (
          <ClientOnly fallback={<div className="h-7 w-[72px]" />}>
            <Sparkline data={spark} color={sparkColor} width={72} height={28} />
          </ClientOnly>
        )}
      </div>
    </div>
  );
}
