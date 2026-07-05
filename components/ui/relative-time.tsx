"use client";

import { useEffect, useState } from "react";
import { formatDate, timeAgo } from "@/lib/utils";

/** Relative time that hydrates safely (absolute date first, then "2h ago"). */
export function RelativeTime({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [text, setText] = useState(() => (value ? formatDate(value) : "—"));

  useEffect(() => {
    if (!value) return;
    setText(timeAgo(value));
  }, [value]);

  if (!value) return <span className={className}>—</span>;

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
