import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { computeStreak } from "@/lib/moodAnalytics";
import type { MoodEntry } from "@/lib/moodTypes";
import type { PetItem, PetOwnerDoc } from "@/lib/petTypes";
import {
  evaluate,
  type AchievementState,
  type AchievementStats,
  type EarnedMap,
} from "@/lib/achievements";
import {
  claimAchievements,
  migrateLocalAchievements,
  subscribeAchievements,
} from "@/lib/achievementsApi";
import { celebrate } from "@/lib/celebrate";

interface Args {
  uid?: string | null;
  entries: MoodEntry[];
  owner?: PetOwnerDoc | null;
  items?: PetItem[];
  hasConnection?: boolean;
}

export function useAchievements({ uid, entries, owner, items = [], hasConnection = false }: Args) {
  const [earned, setEarned] = useState<EarnedMap>({});
  const [counters, setCounters] = useState<Record<string, number>>({});
  // Ids already announced in this session — belt and braces on top of persistence.
  const announced = useRef<Set<string>>(new Set());
  const claiming = useRef(false);

  useEffect(() => {
    announced.current = new Set();
    if (!uid) {
      setEarned({});
      setCounters({});
      return;
    }
    migrateLocalAchievements(uid).catch(() => {});
    const unsub = subscribeAchievements(uid, (doc) => {
      setEarned(doc.earned);
      setCounters(doc.counters);
      // Anything already persisted must never be announced again.
      Object.keys(doc.earned).forEach((id) => announced.current.add(id));
    });
    return () => unsub();
  }, [uid]);

  const stats: AchievementStats = useMemo(
    () => ({
      moodCount: entries.length,
      streak: computeStreak(entries),
      reflections: entries.filter((e) => (e.note ?? "").trim().length > 0).length,
      petsCreated: items.length,
      accessoriesOwned: uid ? (owner?.inventoryByUser?.[uid] ?? []).length : 0,
      eggHatched: (owner?.points ?? 0) > 0 || items.length > 0,
      lettersSent: counters.lettersSent ?? 0,
      hasConnection: hasConnection || owner?.ownerType === "connection",
    }),
    [uid, entries, owner, items, hasConnection, counters],
  );

  const achievements = useMemo(() => evaluate(stats, earned), [stats, earned]);

  // Persist newly unlocked badges once, then celebrate exactly those.
  useEffect(() => {
    if (!uid || claiming.current) return;
    const candidates = achievements
      .filter((a) => a.unlocked && earned[a.id] == null && !announced.current.has(a.id))
      .map((a) => a.id);
    if (candidates.length === 0) return;
    claiming.current = true;
    candidates.forEach((id) => announced.current.add(id));
    claimAchievements(uid, candidates)
      .then((fresh) => {
        fresh.forEach((id) => {
          const a = achievements.find((x) => x.id === id);
          if (!a) return;
          celebrate(id === "streak-30" ? "streak-30" : id === "streak-7" ? "streak-7" : "achievement");
          toast.success(`${a.badge} Achievement unlocked — ${a.name}`);
        });
        if (fresh.length) {
          setEarned((prev) => {
            const next = { ...prev };
            const now = Date.now();
            fresh.forEach((id) => (next[id] = now));
            return next;
          });
        }
      })
      .finally(() => {
        claiming.current = false;
      });
  }, [achievements, earned, uid]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return { achievements, stats, unlockedCount, refresh: () => {} };
}

export type { AchievementState };
