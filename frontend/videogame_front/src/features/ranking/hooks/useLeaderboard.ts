import { useState, useEffect } from "react";
import axios from "axios";
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
      } catch (err: unknown) {
        if (!cancelled) {
          if (axios.isAxiosError(err) && !err.response) {
            setError(
              "Unable to reach the server. Check your connection and try again.",
            );
          } else {
            setError("Could not load the leaderboard. Please try again.");
          }
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
