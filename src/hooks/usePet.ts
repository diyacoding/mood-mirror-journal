import { useEffect, useState } from "react";
import { subscribeOwnerForUser, subscribePetItems } from "@/lib/petApi";
import type { PetItem, PetOwnerDoc } from "@/lib/petTypes";
import { useConnection } from "./useConnection";
import { personalKey, sharedKey } from "@/lib/petApi";
import { captureAccount } from "@/lib/accountSession";

/**
 * Pet data for the signed-in account only. Every piece of state is tagged with
 * the uid it was loaded for, so after an account switch the previous user's
 * owner doc / pets are never returned — even for a single render — and late
 * snapshots from old listeners are ignored.
 */
export function usePet(uid: string | null) {
  const { connection, loading: connectionLoading, error: connectionError } = useConnection(uid);
  const [ownerState, setOwnerState] = useState<{ uid: string; scope: string; doc: PetOwnerDoc | null } | null>(null);
  const [failure, setFailure] = useState<{ scope: string; message: string } | null>(null);
  const [itemsState, setItemsState] = useState<{ ownerId: string; uid: string; list: PetItem[] } | null>(null);

  // Re-subscribe when connection state changes (affects owner key).
  const connKey = !uid || connectionLoading || connectionError ? "unresolved" : connection?.status === "active" ? sharedKey(connection.id) : personalKey(uid);

  useEffect(() => {
    setOwnerState(null);
    setItemsState(null);
    setFailure(null);
    if (!uid || connKey === "unresolved") return;
    let active = true;
    const current = captureAccount(uid);
    const unsub = subscribeOwnerForUser(uid, (doc) => {
      if (!active || !current()) return;
      // Only accept owner docs this user is actually a member of.
      if (doc && (doc.id !== connKey || !Array.isArray(doc.members) || !doc.members.includes(uid) ||
          (doc.ownerType === "user" && (doc.ownerId !== uid || doc.members.length !== 1)))) {
        setFailure({ scope: connKey, message: "Pet ownership could not be verified. No saved data was changed." });
        return;
      }
      setOwnerState({ uid, scope: connKey, doc });
    }, (err) => { if (active && current()) setFailure({ scope: connKey, message: err.message }); });
    return () => {
      active = false;
      unsub();
    };
  }, [uid, connKey]);

  const owner = ownerState && ownerState.uid === uid && ownerState.scope === connKey ? ownerState.doc : null;
  const ownerId = owner?.id ?? null;

  useEffect(() => {
    if (!uid || !ownerId) return;
    let active = true;
    const current = captureAccount(uid);
    const unsub = subscribePetItems(ownerId, (list) => {
      if (active && current()) setItemsState({ ownerId, uid, list });
    }, (err) => { if (active && current()) setFailure({ scope: connKey, message: err.message }); });
    return () => {
      active = false;
      unsub();
    };
  }, [ownerId, uid, connKey]);

  const error = connectionError ?? (failure?.scope === connKey ? failure.message : null);
  const loading = !!uid && !error && (!ownerState || ownerState.uid !== uid || ownerState.scope !== connKey);
  const itemsFresh = !!itemsState && itemsState.uid === uid && itemsState.ownerId === ownerId;
  const items = itemsFresh && itemsState ? itemsState.list : [];
  const itemsLoading = !!uid && !!ownerId && !itemsFresh;
  const currentPet = items.find((i) => i.id === owner?.currentPetId) ?? null;

  return { owner, items, currentPet, loading, itemsLoading, error };
}
