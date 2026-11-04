import { useEffect, useRef, useState } from "react";
import { subscribeMoodEntries } from "@/lib/moodApi";
import type { MoodEntry } from "@/lib/moodTypes";
import { captureAccount } from "@/lib/accountSession";

/**
 * Read-only subscription to the signed-in user's mood entries.
 * Firestore is the single source of truth: this hook never writes.
 */
export function useMoodEntries(uid?: string | null) {
  const [state, setState] = useState<{ uid: string; entries: MoodEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    if (!uid) {
      // Only clear when the user actually signed out (we had a uid before).
      setState(null);
      lastUid.current = null;
      setLoading(false);
      return;
    }
    // Different account -> the old list is not ours; drop it.
    if (lastUid.current && lastUid.current !== uid) setState(null);
    lastUid.current = uid;
    const current = captureAccount(uid);

    let cancelled = false;
    let unsub: () => void = () => {};
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const connect = () => {
      if (cancelled || !current()) return;
      console.info("[mood-flow] subscribing to mood entries", { uid, attempt });
      setLoading(true);
      unsub = subscribeMoodEntries(
        uid,
        (list) => {
          if (cancelled || !current()) return;
          attempt = 0;
          setError(null);
          setState({ uid, entries: list });
          setLoading(false);
        },
        (err) => {
          if (cancelled || !current()) return;
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

  const fresh = state?.uid === uid;
  return { entries: fresh ? state.entries : [], loading: !!uid && (!fresh || loading), error: lastUid.current === uid ? error : null };
}
