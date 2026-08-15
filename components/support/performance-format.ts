export function formatPercent(rate: number | null) {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export function formatRating(rating: number | null, reviewCount?: number) {
  if (rating == null) return reviewCount != null ? `— · ${reviewCount} reviews` : "—";
  const score = `${rating.toFixed(1)} / 5`;
  if (reviewCount == null) return score;
  return `${score} · ${reviewCount} review${reviewCount === 1 ? "" : "s"}`;
}

export function formatWorkload(active: number, cap: number) {
  if (!cap) return String(active);
  return `${active} / ${cap}`;
}

export function freshnessCopy(input: {
  dataFreshness: "LIVE" | "DAILY_RECONCILED";
  generatedAt?: string;
  to?: string;
}) {
  if (input.dataFreshness === "DAILY_RECONCILED") {
    const source = input.to || input.generatedAt;
    if (source) {
      const day = new Date(source);
      if (!Number.isNaN(day.getTime())) {
        return `Data through ${day.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}`;
      }
    }
    return "Daily reconciled";
  }
  return "Updated just now";
}

export function languageLabel(language: string) {
  const key = language.toLowerCase();
  if (key === "ar") return "Arabic";
  if (key === "fr") return "French";
  if (key === "en") return "English";
  if (key === "unknown" || !key) return "Unknown";
  return language;
}

export function categoryLabel(category: string) {
  return category.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function csatVsSolvedHint(
  averageAgentRating: number | null,
  problemSolvedRate: number | null,
  reviewCount: number,
) {
  if (
    reviewCount >= 5 &&
    averageAgentRating != null &&
    averageAgentRating >= 4 &&
    problemSolvedRate != null &&
    problemSolvedRate < 0.7
  ) {
    return "Customers rate the agent highly, but few say the problem was solved.";
  }
  return null;
}
