import { useEffect, useRef, useState } from "react";
import { subscribeMoodEntries } from "@/lib/moodApi";
import type { MoodEntry } from "@/lib/moodTypes";

/**
 * Read-only subscription to the signed-in user's mood entries.
 * Firestore is the single source of truth: this hook never writes.
 */
export function useMoodEntries(uid?: string | null) {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    if (!uid) {
      // Only clear when the user actually signed out (we had a uid before).
      if (lastUid.current) setEntries([]);
      lastUid.current = null;
      setLoading(false);
      return;
    }
    // Different account -> the old list is not ours; drop it.
    if (lastUid.current && lastUid.current !== uid) setEntries([]);
    lastUid.current = uid;

    let cancelled = false;
    let unsub: () => void = () => {};
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const connect = () => {
      console.info("[mood-flow] subscribing to mood entries", { uid, attempt });
      setLoading(true);
      unsub = subscribeMoodEntries(
        uid,
        (list) => {
          if (cancelled) return;
          attempt = 0;
          setError(null);
          setEntries(list);
          setLoading(false);
        },
        (err) => {
          if (cancelled) return;
          setError(err.message);
          setLoading(false);
          // Self-heal a dropped stream (token expiry, sleep/wake, reconnect)
          // WITHOUT clearing what we already have on screen.
          unsub();
          attempt = Math.min(attempt + 1, 5);
          retry = setTimeout(connect, 1000 * 2 ** (attempt - 1));
        },
      );
    };
    connect();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      unsub();
    };
  }, [uid]);

  return { entries, loading, error };
}
