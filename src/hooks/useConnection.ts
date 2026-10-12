import { useEffect, useState } from "react";
import { subscribeMyConnection } from "@/lib/connectionsApi";
import type { Connection } from "@/lib/connectionsTypes";

export function useConnection(uid: string | null) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setConnection(null); // never carry a previous account's connection over
    if (!uid) {
      setConnection(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeMyConnection(uid, (c) => {
      setConnection(c);
      setLoading(false);
    });
    return () => unsub();
  }, [uid]);

  return { connection, loading };
}
