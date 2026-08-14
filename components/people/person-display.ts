export type PersonTab =
  | "overview"
  | "hosting"
  | "travel"
  | "trust"
  | "support"
  | "activity";

export const PERSON_TABS: PersonTab[] = [
  "overview",
  "hosting",
  "travel",
  "trust",
  "support",
  "activity",
];

export function isPersonTab(value: string | null): value is PersonTab {
  return (
    value === "overview" ||
    value === "hosting" ||
    value === "travel" ||
    value === "trust" ||
    value === "support" ||
    value === "activity"
  );
}

export function collected(value: string | number | null | undefined): string {
  if (value == null) return "Not collected";
  const text = String(value).trim();
  if (!text || text === "—" || text === "null") return "Not collected";
  return text;
}

export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export function formatAuditAction(action: string): string {
  return action
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
