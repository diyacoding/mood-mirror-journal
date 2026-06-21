// Pet Growth — Firestore data layer.
// Personal pet: owner doc id = `u_{uid}`. Members = [uid].
// Shared pet (when connection active): owner doc id = `c_{cid}`. Members = [userA, userB].

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { Transaction } from "firebase/firestore";
import { db, auth } from "./firebase";
import { findMyConnection } from "./connectionsApi";
import type { AccessoryKey, PetItem, PetOwnerDoc } from "./petTypes";
import { ACCESSORIES } from "./petTypes";

const COL = "pets";

const ownerRef = (key: string) => doc(db, COL, key);
const itemsCol = (key: string) => collection(db, COL, key, "items");
const itemRef = (key: string, id: string) => doc(db, COL, key, "items", id);

export interface PetAwardResult {
  ownerKey: string;
  pointsBefore: number;
  pointsAfter: number;
  pointsAwarded: number;
  spinDelta: number;
  newPetDelta: number;
  firstHatch: boolean;
  pendingNewPet: boolean;
}

export const personalKey = (uid: string) => `u_${uid}`;
export const sharedKey = (cid: string) => `c_${cid}`;

// Resolve which owner doc applies to a user *right now*.
export async function resolveOwnerKey(uid: string): Promise<{
  key: string;
  type: "user" | "connection";
  ownerId: string;
  members: string[];
}> {
  const conn = await findMyConnection(uid).catch(() => null);
  if (conn && conn.status === "active" && conn.userB) {
    return {
      key: sharedKey(conn.id),
      type: "connection",
      ownerId: conn.id,
      members: [conn.userA, conn.userB],
    };
  }
  return { key: personalKey(uid), type: "user", ownerId: uid, members: [uid] };
}

export type ResolvedPetOwner = Awaited<ReturnType<typeof resolveOwnerKey>>;

export async function preparePetOwnerDoc(info: ResolvedPetOwner): Promise<void> {
  await setDoc(
    ownerRef(info.key),
    {
      ownerType: info.type,
      ownerId: info.ownerId,
      members: info.members,
    },
    { merge: true },
  );
}

async function ensureOwnerDoc(uid: string): Promise<PetOwnerDoc> {
  const info = await resolveOwnerKey(uid);
  const ref = ownerRef(info.key);
  await preparePetOwnerDoc(info);
  const snap = await getDoc(ref);
  const init: Omit<PetOwnerDoc, "id"> = {
    ownerType: info.type,
    ownerId: info.ownerId,
    members: info.members,
    points: 0,
    currentPetId: null,
    pendingNewPet: false,
    spinsByUser: Object.fromEntries(info.members.map((m) => [m, 0])),
    inventoryByUser: Object.fromEntries(info.members.map((m) => [m, []])),
    milestone50: 0,
    milestone100: 0,
  };
  if (snap.exists()) return { id: info.key, ...init, ...(snap.data() as any) } as PetOwnerDoc;
  await setDoc(ref, { ...init, serverCreatedAt: serverTimestamp() }, { merge: true });
  return { id: info.key, ...init };
}

export function subscribeOwnerForUser(
  uid: string,
  cb: (doc: PetOwnerDoc | null) => void,
): () => void {
  let unsub = () => {};
  let cancelled = false;
  (async () => {
    const info = await resolveOwnerKey(uid);
    if (cancelled) return;
    await ensureOwnerDoc(uid).catch(() => null);
    if (cancelled) return;
    unsub = onSnapshot(ownerRef(info.key), (snap) => {
      if (!snap.exists()) cb(null);
      else cb({ id: info.key, ...(snap.data() as any) } as PetOwnerDoc);
    });
  })();
  return () => {
    cancelled = true;
    unsub();
  };
}

export function subscribePetItems(
  ownerKey: string,
  cb: (items: PetItem[]) => void,
): () => void {
  return onSnapshot(itemsCol(ownerKey), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as PetItem[];
    list.sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
}

// ─── Mutations ────────────────────────────────────────────────

export async function createPet(
  uid: string,
  imageDataUrl: string,
  name?: string,
): Promise<string> {
  console.info("[pet-save] createPet start", {
    uid,
    authUid: auth.currentUser?.uid,
    nameSize: imageDataUrl?.length,
  });
  if (!auth.currentUser?.uid) {
    throw new Error("You must be signed in to save a pet.");
  }
  const info = await resolveOwnerKey(uid);
  console.info("[pet-save] resolved owner", info);
  await ensureOwnerDoc(uid);
  console.info("[pet-save] owner doc ensured");

  const item: Omit<PetItem, "id"> & { ownerKey: string; members: string[] } = {
    imageDataUrl,
    name: name ?? "Lumi",
    accessories: [],
    createdAt: Date.now(),
    createdBy: uid,
    // Ownership fields on the item itself so rules can verify directly
    // without needing to read the parent doc.
    ownerKey: info.key,
    members: info.members,
  };
  console.info("[pet-save] item payload", { ...item, imageDataUrl: `[${imageDataUrl.length} chars]` });

  let ref;
  try {
    ref = await addDoc(itemsCol(info.key), item);
    console.info("[pet-save] ✅ item written", { id: ref.id });
  } catch (err: any) {
    console.error("[pet-save] ❌ items write FAILED", {
      code: err?.code,
      message: err?.message,
      ownerKey: info.key,
      uid,
    });
    throw new Error(`Save failed${err?.code ? ` (${err.code})` : ""}: ${err?.message ?? "unknown"}`);
  }

  try {
    await updateDoc(ownerRef(info.key), {
      currentPetId: ref.id,
      pendingNewPet: false,
    });
    console.info("[pet-save] ✅ owner doc updated with currentPetId");
  } catch (err: any) {
    console.warn("[pet-save] owner update failed (pet still saved)", err?.code, err?.message);
  }
  return ref.id;
}

export async function applyAccessory(
  uid: string,
  accessory: AccessoryKey,
): Promise<void> {
  const info = await resolveOwnerKey(uid);
  const ownerSnap = await getDoc(ownerRef(info.key));
  if (!ownerSnap.exists()) return;
  const data = ownerSnap.data() as PetOwnerDoc;
  if (!data.currentPetId) return;

  const itemR = itemRef(info.key, data.currentPetId);
  await runTransaction(db, async (tx) => {
    const s = await tx.get(itemR);
    if (!s.exists()) return;
    const cur = (s.data() as any).accessories ?? [];
    const next = cur.includes(accessory) ? cur : [...cur, accessory];
    tx.update(itemR, { accessories: next });
  });
}

export async function removeAccessory(
  uid: string,
  accessory: AccessoryKey,
): Promise<void> {
  const info = await resolveOwnerKey(uid);
  const ownerSnap = await getDoc(ownerRef(info.key));
  if (!ownerSnap.exists()) return;
  const data = ownerSnap.data() as PetOwnerDoc;
  if (!data.currentPetId) return;
  const itemR = itemRef(info.key, data.currentPetId);
  await runTransaction(db, async (tx) => {
    const s = await tx.get(itemR);
    if (!s.exists()) return;
    const cur: AccessoryKey[] = (s.data() as any).accessories ?? [];
    tx.update(itemR, { accessories: cur.filter((a) => a !== accessory) });
  });
}

export async function selectPet(uid: string, petId: string): Promise<void> {
  const info = await resolveOwnerKey(uid);
  await updateDoc(ownerRef(info.key), { currentPetId: petId, pendingNewPet: false });
}

// Award points after a mood log. Fires whenever a mood is added.
// Crosses milestone thresholds in 50- and 100-point steps.
export async function awardResolvedPointsInTransaction(
  tx: Transaction,
  info: ResolvedPetOwner,
  amount = 10,
): Promise<PetAwardResult> {
  const ref = ownerRef(info.key);
  const snap = await tx.get(ref);
  let data: PetOwnerDoc;
  if (!snap.exists()) {
    data = {
      id: info.key,
      ownerType: info.type,
      ownerId: info.ownerId,
      members: info.members,
      points: 0,
      currentPetId: null,
      pendingNewPet: false,
      spinsByUser: Object.fromEntries(info.members.map((m) => [m, 0])),
      inventoryByUser: Object.fromEntries(info.members.map((m) => [m, []])),
      milestone50: 0,
      milestone100: 0,
    };
  } else {
    data = { id: info.key, ...(snap.data() as any) } as PetOwnerDoc;
    for (const m of info.members) {
      if (!(m in (data.spinsByUser ?? {}))) data.spinsByUser = { ...data.spinsByUser, [m]: 0 };
      if (!(m in (data.inventoryByUser ?? {}))) data.inventoryByUser = { ...data.inventoryByUser, [m]: [] };
    }
  }

  const before = data.points ?? 0;
  const after = before + amount;
  const newM50 = Math.floor(after / 50);
  const oldM50 = data.milestone50 ?? Math.floor(before / 50);
  const spinDelta = Math.max(0, newM50 - oldM50);
  const newM100 = Math.floor(after / 100);
  const oldM100 = data.milestone100 ?? Math.floor(before / 100);
  const newPetDelta = Math.max(0, newM100 - oldM100);
  const nextSpins = { ...(data.spinsByUser ?? {}) };
  if (spinDelta > 0) {
    for (const m of info.members) nextSpins[m] = (nextSpins[m] ?? 0) + spinDelta;
  }
  const firstHatch = before === 0 && after > 0 && !data.currentPetId;
  const pendingNewPet = data.pendingNewPet || newPetDelta > 0 || firstHatch;

  tx.set(
    ref,
    {
      ownerType: info.type,
      ownerId: info.ownerId,
      members: info.members,
      points: after,
      currentPetId: data.currentPetId ?? null,
      pendingNewPet,
      spinsByUser: nextSpins,
      inventoryByUser: data.inventoryByUser ?? Object.fromEntries(info.members.map((m) => [m, []])),
      milestone50: newM50,
      milestone100: newM100,
      serverUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    ownerKey: info.key,
    pointsBefore: before,
    pointsAfter: after,
    pointsAwarded: amount,
    spinDelta,
    newPetDelta,
    firstHatch,
    pendingNewPet,
  };
}

export async function awardPointsForMood(uid: string, amount = 10): Promise<PetAwardResult> {
  const info = await resolveOwnerKey(uid);
  await preparePetOwnerDoc(info);
  return runTransaction(db, (tx) => awardResolvedPointsInTransaction(tx, info, amount));
}

export async function consumeSpin(uid: string): Promise<AccessoryKey | null> {
  const info = await resolveOwnerKey(uid);
  const ref = ownerRef(info.key);
  let awarded: AccessoryKey | null = null;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as PetOwnerDoc;
    const spins = (data.spinsByUser ?? {})[uid] ?? 0;
    if (spins <= 0) return;
    const pool = ACCESSORIES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    awarded = pick.key;
    const inv = (data.inventoryByUser ?? {})[uid] ?? [];
    const nextInv = inv.includes(pick.key) ? inv : [...inv, pick.key];
    tx.update(ref, {
      [`spinsByUser.${uid}`]: spins - 1,
      [`inventoryByUser.${uid}`]: nextInv,
    });
  });
  return awarded;
}

export async function addCustomAccessoryToInventory(
  uid: string,
): Promise<void> {
  // Custom drawings are surfaced as the "custom" accessory key.
  const info = await resolveOwnerKey(uid);
  const ref = ownerRef(info.key);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as PetOwnerDoc;
    const inv = (data.inventoryByUser ?? {})[uid] ?? [];
    if (!inv.includes("custom")) {
      tx.update(ref, { [`inventoryByUser.${uid}`]: [...inv, "custom"] });
    }
  });
}
