"use client";

import { useEffect, useState } from "react";

export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  initialValue?: T,
) {
  const [data, setData] = useState<T | null>(initialValue ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message ?? "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loader();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  return { data, error, loading, reload };
}

/** Use when data should always be an array (empty while loading). */
export function useAsyncList<T>(
  loader: () => Promise<T[]>,
  deps: unknown[] = [],
) {
  const { data, error, loading, reload } = useAsyncData(loader, deps, [] as T[]);
  return { data: data ?? ([] as T[]), error, loading, reload };
}

/** Use when stats/object should have safe defaults while loading. */
export function useAsyncStats<T extends object>(
  loader: () => Promise<T>,
  fallback: T,
  deps: unknown[] = [],
) {
  const { data, error, loading, reload } = useAsyncData(loader, deps, fallback);
  return { data: data ?? fallback, error, loading, reload };
}
