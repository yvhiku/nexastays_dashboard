import { collected } from "./person-display";

export function PersonField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-nexa-ink-4">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-nexa-ink-2">
        {collected(value)}
      </dd>
    </div>
  );
}

export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-nexa-line bg-white p-3">
      <p className="text-lg font-semibold text-nexa-ink">{value}</p>
      <p className="mt-0.5 text-xs text-nexa-ink-4">{label}</p>
    </div>
  );
}
