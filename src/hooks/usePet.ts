import { useEffect, useState } from "react";
import { subscribeOwnerForUser, subscribePetItems } from "@/lib/petApi";
import type { PetItem, PetOwnerDoc } from "@/lib/petTypes";
import { useConnection } from "./useConnection";

export function usePet(uid: string | null) {
  const { connection } = useConnection(uid);
  const [owner, setOwner] = useState<PetOwnerDoc | null>(null);
  const [items, setItems] = useState<PetItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-subscribe when connection state changes (affects owner key)
  const connKey = connection?.status === "active" ? connection.id : "personal";

  useEffect(() => {
    if (!uid) {
      setOwner(null);
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeOwnerForUser(uid, (doc) => {
      setOwner(doc);
      setLoading(false);
    });
    return () => unsub();
  }, [uid, connKey]);

  useEffect(() => {
    if (!owner?.id) {
      setItems([]);
      return;
    }
    const unsub = subscribePetItems(owner.id, setItems);
    return () => unsub();
  }, [owner?.id]);

  const currentPet = items.find((i) => i.id === owner?.currentPetId) ?? null;

  return { owner, items, currentPet, loading };
}
