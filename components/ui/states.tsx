import * as React from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-10 text-sm text-nexa-ink-4",
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("py-12 text-center", className)}>
      <Icon className="mx-auto h-10 w-10 text-nexa-ink-4" />
      <p className="mt-3 text-sm font-medium text-nexa-ink">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-nexa-ink-4">{description}</p>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load data",
  detail,
  onRetry,
  className,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-nexa-danger/30 bg-nexa-danger-soft px-3 py-3 text-sm text-nexa-danger sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">{title}</p>
          {detail ? <p className="mt-0.5 text-nexa-danger/80">{detail}</p> : null}
        </div>
      </div>
      {onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0">
          Retry
        </Button>
      ) : null}
    </div>
  );
}
