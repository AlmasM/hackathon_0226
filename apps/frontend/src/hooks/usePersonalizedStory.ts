import { useCallback, useEffect, useState } from "react";
import type { CompiledStory } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? "";

export interface UsePersonalizedStoryResult {
  story: CompiledStory | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Fetches a personalized story from the backend API.
 * Re-fetches when userProfileId changes (persona switch). Cancels in-flight requests.
 */
export function usePersonalizedStory(
  restaurantId: string,
  userProfileId: string,
): UsePersonalizedStoryResult {
  const [story, setStory] = useState<CompiledStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStory = useCallback(async (rid: string, pid: string, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    setStory(null);
    try {
      const res = await fetch(`${API_BASE}/api/restaurants/${rid}/story/personalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_profile_id: pid }),
        signal,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(
          res.status === 404 ? "Restaurant not found" : errBody || `HTTP ${res.status}`,
        );
      }
      const data = await res.json();
      if (!data?.restaurant || !Array.isArray(data?.segments)) {
        throw new Error("Invalid story response");
      }
      setStory(data as CompiledStory);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e : new Error("Failed to load story"));
      setStory(null);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!restaurantId || !userProfileId) {
      setLoading(false);
      setError(null);
      setStory(null);
      return;
    }
    const controller = new AbortController();
    fetchStory(restaurantId, userProfileId, controller.signal);
    return () => controller.abort();
  }, [restaurantId, userProfileId, fetchStory]);

  return { story, loading, error };
}
