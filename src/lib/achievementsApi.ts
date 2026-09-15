// Achievement persistence.
// Source of truth is Firestore: `user_achievements/{uid}` with
//   { userId, earned: { [achievementId]: millis }, counters: { [name]: number } }
// localStorage stays as an offline mirror/fallback, so if the new security rule
// hasn't been published yet nothing breaks and nothing is announced twice.

import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { readCounters, readEarned, writeEarned, type EarnedMap } from "./achievements";

const COL = "user_achievements";
const ref = (uid: string) => doc(db, COL, uid);

export interface AchievementDoc {
  earned: EarnedMap;
  counters: Record<string, number>;
}

const countersKey = (uid: string) => `mm.counters.${uid}`;

function writeLocalCounters(uid: string, counters: Record<string, number>) {
  try {
    localStorage.setItem(countersKey(uid), JSON.stringify(counters));
  } catch {
    /* ignore */
  }
}

/** Merge local state up on first load so existing progress is never lost. */
export async function migrateLocalAchievements(uid: string): Promise<void> {
  const localEarned = readEarned(uid);
  const localCounters = readCounters(uid);
  if (Object.keys(localEarned).length === 0 && Object.keys(localCounters).length === 0) return;
  try {
    const snap = await getDoc(ref(uid));
    const remote = (snap.exists() ? snap.data() : {}) as Partial<AchievementDoc>;
    const earned: EarnedMap = { ...localEarned, ...(remote.earned ?? {}) };
    const counters: Record<string, number> = { ...(remote.counters ?? {}) };
    for (const [k, v] of Object.entries(localCounters)) {
      counters[k] = Math.max(counters[k] ?? 0, v);
    }
    await setDoc(ref(uid), { userId: uid, earned, counters }, { merge: true });
  } catch {
    /* offline / rule not published yet — local mirror keeps working */
  }
}

export function subscribeAchievements(
  uid: string,
  cb: (doc: AchievementDoc) => void,
): () => void {
  // Emit local state immediately so the UI is never empty while Firestore loads.
  cb({ earned: readEarned(uid), counters: readCounters(uid) });
  try {
    return onSnapshot(
      ref(uid),
      (snap) => {
        const data = (snap.exists() ? snap.data() : {}) as Partial<AchievementDoc>;
        const earned = { ...readEarned(uid), ...(data.earned ?? {}) };
        const counters = { ...readCounters(uid), ...(data.counters ?? {}) };
        writeEarned(uid, earned);
        writeLocalCounters(uid, counters);
        cb({ earned, counters });
      },
      () => {
        cb({ earned: readEarned(uid), counters: readCounters(uid) });
      },
    );
  } catch {
    return () => {};
  }
}

/**
 * Persist newly earned badges. Only ids that are not already recorded (locally
 * or remotely) are written, and the resolved list of *actually new* ids is
 * returned so callers announce each badge exactly once, ever.
 */
export async function claimAchievements(uid: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const now = Date.now();
  let remoteEarned: EarnedMap = {};
  let remoteOk = false;
  try {
    const snap = await getDoc(ref(uid));
    remoteEarned = ((snap.exists() ? (snap.data() as any).earned : {}) ?? {}) as EarnedMap;
    remoteOk = true;
  } catch {
    remoteOk = false;
  }
  const local = readEarned(uid);
  const fresh = ids.filter((id) => local[id] == null && remoteEarned[id] == null);
  if (fresh.length === 0) return [];

  const nextEarned: EarnedMap = { ...local, ...remoteEarned };
  fresh.forEach((id) => (nextEarned[id] = now));
  writeEarned(uid, nextEarned);
  if (remoteOk) {
    try {
      await setDoc(ref(uid), { userId: uid, earned: nextEarned }, { merge: true });
    } catch {
      /* local mirror already updated */
    }
  }
  return fresh;
}

/** Increment a counter (e.g. lettersSent) in both Firestore and the local mirror. */
export async function bumpCloudCounter(uid: string, name: string, by = 1): Promise<void> {
  const local = readCounters(uid);
  let counters: Record<string, number> = { ...local };
  try {
    const snap = await getDoc(ref(uid));
    const remote = ((snap.exists() ? (snap.data() as any).counters : {}) ?? {}) as Record<string, number>;
    for (const [k, v] of Object.entries(remote)) counters[k] = Math.max(counters[k] ?? 0, v);
  } catch {
    /* offline */
  }
  counters[name] = (counters[name] ?? 0) + by;
  writeLocalCounters(uid, counters);
  try {
    await setDoc(ref(uid), { userId: uid, counters }, { merge: true });
  } catch {
    /* local mirror already updated */
  }
}
