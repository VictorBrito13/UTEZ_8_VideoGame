import { useState, useEffect } from "react";
import apiClient from "../../../api/apiClient";
import type { LeaderboardEntry } from "../types";

type UseLeaderboardResult = {
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
};

export function useLeaderboard(limit = 100): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/api/leaderboard", {
          params: { limit },
        });
        if (!cancelled) {
          setEntries(data.results ?? []);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load leaderboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { entries, loading, error };
}
