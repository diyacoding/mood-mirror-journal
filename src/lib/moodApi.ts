// Firestore is the single source of truth for all mood data.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { MoodEntry } from "./moodTypes";

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
  const payload = {
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
  return ref.id;
}

export async function deleteMoodEntry(id: string): Promise<void> {
  await deleteDoc(doc(db, MOOD_COLLECTION, id));
}

export function subscribeMoodEntries(
  cb: (entries: MoodEntry[]) => void,
  onError?: (e: Error) => void,
): () => void {
  const q = query(col(), orderBy("createdAt", "desc"));
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
      cb(list);
    },
    (err) => onError?.(err),
  );
}

export { todayKey };
