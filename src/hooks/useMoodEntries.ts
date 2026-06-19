import { useEffect, useState } from "react";
import { subscribeMoodEntries } from "@/lib/moodApi";
import type { MoodEntry } from "@/lib/moodTypes";

export function useMoodEntries(uid?: string | null) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeMoodEntries(
      uid,
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
  }, [uid]);

  return { entries, loading, error };
}
