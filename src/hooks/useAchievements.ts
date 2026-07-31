import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { computeStreak } from "@/lib/moodAnalytics";
import type { MoodEntry } from "@/lib/moodTypes";
import type { PetItem, PetOwnerDoc } from "@/lib/petTypes";
import {
  evaluate,
  readCounters,
  readEarned,
  writeEarned,
  type AchievementState,
  type AchievementStats,
} from "@/lib/achievements";
import { celebrate } from "@/lib/celebrate";

interface Args {
  uid?: string | null;
  entries: MoodEntry[];
  owner?: PetOwnerDoc | null;
  items?: PetItem[];
  hasConnection?: boolean;
}

export function useAchievements({ uid, entries, owner, items = [], hasConnection = false }: Args) {
  const [version, setVersion] = useState(0);

  const stats: AchievementStats = useMemo(() => {
    const counters = uid ? readCounters(uid) : {};
    return {
      moodCount: entries.length,
      streak: computeStreak(entries),
      reflections: entries.filter((e) => (e.note ?? "").trim().length > 0).length,
      petsCreated: items.length,
      accessoriesOwned: uid ? (owner?.inventoryByUser?.[uid] ?? []).length : 0,
      eggHatched: (owner?.points ?? 0) > 0 || items.length > 0,
      lettersSent: counters.lettersSent ?? 0,
      hasConnection: hasConnection || owner?.ownerType === "connection",
    };
  }, [uid, entries, owner, items, hasConnection, version]);

  const achievements = useMemo(
    () => evaluate(stats, uid ? readEarned(uid) : {}),
    [stats, uid, version],
  );

  // Persist newly unlocked badges + celebrate
  useEffect(() => {
    if (!uid) return;
    const earned = readEarned(uid);
    const fresh = achievements.filter((a) => a.unlocked && earned[a.id] == null);
    if (fresh.length === 0) return;
    const now = Date.now();
    fresh.forEach((a) => (earned[a.id] = now));
    writeEarned(uid, earned);
    fresh.forEach((a) => {
      celebrate(a.id === "streak-30" ? "streak-30" : a.id === "streak-7" ? "streak-7" : "achievement");
      toast.success(`${a.badge} Achievement unlocked — ${a.name}`);
    });
    setVersion((v) => v + 1);
  }, [achievements, uid]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return { achievements, stats, unlockedCount, refresh: () => setVersion((v) => v + 1) };
}

export type { AchievementState };
