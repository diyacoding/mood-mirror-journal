import { useEffect, useState } from "react";
import { subscribeMyConnection } from "@/lib/connectionsApi";
import type { Connection } from "@/lib/connectionsTypes";
import { captureAccount } from "@/lib/accountSession";

export function useConnection(uid: string | null) {
  const [state, setState] = useState<{ uid: string; connection: Connection | null; error: string | null } | null>(null);

  useEffect(() => {
    setState(null);
    if (!uid) return;
    let active = true;
    const current = captureAccount(uid);
    const unsub = subscribeMyConnection(uid, (c) => {
      if (active && current()) setState({ uid, connection: c, error: null });
    }, (err) => {
      if (active && current()) setState({ uid, connection: null, error: err.message });
    });
    return () => { active = false; unsub(); };
  }, [uid]);

  const fresh = state?.uid === uid ? state : null;
  return { connection: fresh?.connection ?? null, loading: !!uid && !fresh, error: fresh?.error ?? null };
}
