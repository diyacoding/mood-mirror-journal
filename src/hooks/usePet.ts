import { useEffect, useState } from "react";
import { subscribeOwnerForUser, subscribePetItems } from "@/lib/petApi";
import type { PetItem, PetOwnerDoc } from "@/lib/petTypes";
import { useConnection } from "./useConnection";

/**
 * Pet data for the signed-in account only. Every piece of state is tagged with
 * the uid it was loaded for, so after an account switch the previous user's
 * owner doc / pets are never returned — even for a single render — and late
 * snapshots from old listeners are ignored.
 */
export function usePet(uid: string | null) {
  const { connection } = useConnection(uid);
  const [ownerState, setOwnerState] = useState<{ uid: string; doc: PetOwnerDoc | null } | null>(null);
  const [itemsState, setItemsState] = useState<{ ownerId: string; uid: string; list: PetItem[] } | null>(null);

  // Re-subscribe when connection state changes (affects owner key).
  const connKey = connection?.status === "active" ? connection.id : "personal";

  useEffect(() => {
    setOwnerState(null);
    setItemsState(null);
    if (!uid) return;
    let active = true;
    const unsub = subscribeOwnerForUser(uid, (doc) => {
      if (!active) return;
      // Only accept owner docs this user is actually a member of.
      if (doc && Array.isArray(doc.members) && !doc.members.includes(uid)) return;
      setOwnerState({ uid, doc });
    });
    return () => {
      active = false;
      unsub();
    };
  }, [uid, connKey]);

  const owner = ownerState && ownerState.uid === uid ? ownerState.doc : null;
  const ownerId = owner?.id ?? null;

  useEffect(() => {
    if (!uid || !ownerId) return;
    let active = true;
    const unsub = subscribePetItems(ownerId, (list) => {
      if (active) setItemsState({ ownerId, uid, list });
    });
    return () => {
      active = false;
      unsub();
    };
  }, [ownerId, uid]);

  const loading = !!uid && (!ownerState || ownerState.uid !== uid);
  const itemsFresh = !!itemsState && itemsState.uid === uid && itemsState.ownerId === ownerId;
  const items = itemsFresh ? itemsState!.list : [];
  const itemsLoading = !!uid && !!ownerId && !itemsFresh;
  const currentPet = items.find((i) => i.id === owner?.currentPetId) ?? null;

  return { owner, items, currentPet, loading, itemsLoading };
}
