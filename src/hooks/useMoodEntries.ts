import { useEffect, useState } from "react";
import { subscribeMoodEntries } from "@/lib/moodApi";
import type { MoodEntry } from "@/lib/moodTypes";

export function useMoodEntries() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeMoodEntries(
      (list) => {
        setEntries(list);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { entries, loading, error };
}
