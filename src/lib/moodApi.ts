// Firestore is the single source of truth for all mood data.
// All entries are scoped to the signed-in user via `userId`.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import type { MoodEntry } from "./moodTypes";
import { awardPointsForMood } from "./petApi";

export const MOOD_COLLECTION = "mood_entries";

const col = () => collection(db, MOOD_COLLECTION);

export type NewMoodEntry = Omit<MoodEntry, "id" | "createdAt" | "date"> & {
  date?: string;
  createdAt?: number;
};

export const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export async function addMoodEntry(entry: NewMoodEntry): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");
  const payload = {
    userId: uid,
    mood: entry.mood,
    intensity: entry.intensity,
    note: entry.note ?? "",
    source: entry.source,
    confidence: entry.confidence ?? null,
    behaviors: entry.behaviors ?? {},
    date: entry.date ?? todayKey(),
    createdAt: entry.createdAt ?? Date.now(),
    serverCreatedAt: Timestamp.now(),
  };
  const ref = await addDoc(col(), payload);
  // Pet Growth: +10 points per mood entry. Non-blocking; failure must not break logging.
  awardPointsForMood(uid, 10).catch((e) => console.warn("[pet] award failed", e));
  return ref.id;
}

export async function deleteMoodEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, MOOD_COLLECTION, id));
}

export function subscribeMoodEntries(
  cb: (entries: MoodEntry[]) => void,
  onError?: (e: Error) => void,
): () => void {
  const uid = auth.currentUser?.uid;
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
