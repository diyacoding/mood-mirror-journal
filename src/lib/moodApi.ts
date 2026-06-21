// Firestore is the single source of truth for all mood data.
// All entries are scoped to the signed-in user via `userId`.

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  runTransaction,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { MoodEntry } from "./moodTypes";
import {
  awardResolvedPointsInTransaction,
  preparePetOwnerDoc,
  resolveOwnerKey,
  type PetAwardResult,
} from "./petApi";

export const MOOD_COLLECTION = "mood_entries";

const col = () => collection(db, MOOD_COLLECTION);

export type NewMoodEntry = Omit<MoodEntry, "id" | "createdAt" | "date"> & {
  date?: string;
  createdAt?: number;
};

export interface MoodSaveResult {
  id: string;
  petAward: PetAwardResult;
}

export const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as any;
  if (typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return obj;
}

function sanitizeBehaviors(b: any) {
  const src = b ?? {};
  const num = (v: any) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    sleepHours: num(src.sleepHours),
    sleepMinutes: num(src.sleepMinutes),
    exerciseHours: num(src.exerciseHours),
    exerciseMinutes: num(src.exerciseMinutes),
    screenTimeHours: num(src.screenTimeHours),
  };
}

export async function addMoodEntry(entry: NewMoodEntry): Promise<MoodSaveResult> {
  const uid = auth.currentUser?.uid;
  console.info("[mood-flow] addMoodEntry start", { uid, mood: entry.mood });
  if (!uid) throw new Error("You must be signed in to save a mood.");

  const entryRef = doc(col());
  const payload = stripUndefined({
    userId: uid,
    mood: entry.mood,
    intensity: entry.intensity ?? 5,
    note: entry.note ?? "",
    source: entry.source,
    confidence: entry.confidence ?? null,
    behaviors: sanitizeBehaviors(entry.behaviors),
    date: entry.date ?? todayKey(),
    createdAt: entry.createdAt ?? Date.now(),
    serverCreatedAt: Timestamp.now(),
  });
  console.info("[mood-flow] Mood payload (sanitized)", JSON.stringify(payload, null, 2));

  // 1) Save the mood entry — this is the critical write.
  try {
    const { setDoc } = await import("firebase/firestore");
    await setDoc(entryRef, payload);
    console.info("[mood-flow] Mood saved ✔", { id: entryRef.id });
  } catch (err: any) {
    console.error("[mood-flow] Mood save FAILED", {
      code: err?.code,
      message: err?.message,
      err,
    });
    throw new Error(
      `Save failed${err?.code ? ` (${err.code})` : ""}: ${err?.message ?? "unknown error"}`,
    );
  }

  // 2) Award pet points — never let this block / fail the mood save.
  let petAward: PetAwardResult = {
    ownerKey: `u_${uid}`,
    pointsBefore: 0,
    pointsAfter: 0,
    pointsAwarded: 0,
    spinDelta: 0,
    newPetDelta: 0,
    firstHatch: false,
    pendingNewPet: false,
  };
  try {
    const petOwner = await resolveOwnerKey(uid);
    console.info("[mood-flow] Pet owner resolved", petOwner);
    await preparePetOwnerDoc(petOwner);
    console.info("[mood-flow] Pet owner doc prepared ✔");
    petAward = await runTransaction(db, (tx) =>
      awardResolvedPointsInTransaction(tx, petOwner, 10),
    );
    console.info("[mood-flow] ✅ Mood saved");
    console.info("[mood-flow] Current pet points:", petAward.pointsBefore);
    console.info("[mood-flow] Updated pet points:", petAward.pointsAfter);
    console.info("[mood-flow] firstHatch:", petAward.firstHatch, "pendingNewPet:", petAward.pendingNewPet);
  } catch (err: any) {
    console.error("[mood-flow] ❌ Pet award FAILED", {
      code: err?.code,
      message: err?.message,
      err,
    });
    // Re-throw is too aggressive (mood is already saved). Instead, mark so UI
    // can still auto-navigate to the pet screen and the user can force-hatch.
    petAward.pendingNewPet = true;
    petAward.firstHatch = true;
  }

  return { id: entryRef.id, petAward };
}

export async function deleteMoodEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, MOOD_COLLECTION, id));
}

export function subscribeMoodEntries(
  uid: string | null | undefined,
  cb: (entries: MoodEntry[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!uid) {
    cb([]);
    return () => {};
  }
  // Filter to current user. orderBy by createdAt on client to avoid composite index requirement.
  const q = query(col(), where("userId", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: MoodEntry[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          mood: data.mood,
          intensity: data.intensity ?? 5,
          note: data.note ?? "",
          source: data.source ?? "manual",
          confidence: data.confidence ?? undefined,
          behaviors: data.behaviors ?? {},
          date: data.date ?? todayKey(),
          createdAt: data.createdAt ?? Date.now(),
        };
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      cb(list);
    },
    (err) => onError?.(err),
  );
}
