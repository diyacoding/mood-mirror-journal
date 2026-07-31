import { ACCESSORIES } from "./petTypes";

export type AchievementCategory = "Mood Logging" | "Pet" | "Reflection" | "Connections";

export interface AchievementStats {
  moodCount: number;
  streak: number;
  reflections: number;
  petsCreated: number;
  accessoriesOwned: number;
  eggHatched: boolean;
  lettersSent: number;
  hasConnection: boolean;
}

export interface AchievementDef {
  id: string;
  badge: string;
  name: string;
  description: string;
  category: AchievementCategory;
  /** current progress toward the goal */
  progress: (s: AchievementStats) => number;
  goal: number;
}

const TOTAL_ACCESSORIES = ACCESSORIES.length;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-mood", badge: "🌱", name: "First Mood Logged", description: "Log your very first mood.", category: "Mood Logging", progress: (s) => s.moodCount, goal: 1 },
  { id: "streak-7", badge: "🔥", name: "7-Day Streak", description: "Check in seven days in a row.", category: "Mood Logging", progress: (s) => s.streak, goal: 7 },
  { id: "streak-30", badge: "🌟", name: "30-Day Streak", description: "Check in thirty days in a row.", category: "Mood Logging", progress: (s) => s.streak, goal: 30 },
  { id: "logs-100", badge: "💯", name: "100 Mood Logs", description: "Log one hundred moods.", category: "Mood Logging", progress: (s) => s.moodCount, goal: 100 },

  { id: "egg-hatched", badge: "🥚", name: "First Egg Hatched", description: "Hatch your starter egg.", category: "Pet", progress: (s) => (s.eggHatched ? 1 : 0), goal: 1 },
  { id: "pet-created", badge: "🎨", name: "First Pet Created", description: "Design your first companion.", category: "Pet", progress: (s) => s.petsCreated, goal: 1 },
  { id: "accessory-first", badge: "🎁", name: "First Accessory", description: "Win an accessory from the prize wheel.", category: "Pet", progress: (s) => s.accessoriesOwned, goal: 1 },
  { id: "accessory-all", badge: "👑", name: "Fully Accessorised", description: "Unlock every accessory.", category: "Pet", progress: (s) => s.accessoriesOwned, goal: TOTAL_ACCESSORIES },
  { id: "pets-5", badge: "🐾", name: "Five Pets Created", description: "Create five different pets.", category: "Pet", progress: (s) => s.petsCreated, goal: 5 },

  { id: "reflect-1", badge: "✍️", name: "First Reflection", description: "Write a note with a mood entry.", category: "Reflection", progress: (s) => s.reflections, goal: 1 },
  { id: "reflect-50", badge: "📖", name: "50 Reflections", description: "Write fifty reflections.", category: "Reflection", progress: (s) => s.reflections, goal: 50 },
  { id: "reflect-100", badge: "📚", name: "100 Reflections", description: "Write one hundred reflections.", category: "Reflection", progress: (s) => s.reflections, goal: 100 },

  { id: "letter-1", badge: "💌", name: "First Letter Sent", description: "Send a letter to your connection.", category: "Connections", progress: (s) => s.lettersSent, goal: 1 },
  { id: "connection-1", badge: "🤝", name: "First Connection", description: "Connect with someone you trust.", category: "Connections", progress: (s) => (s.hasConnection ? 1 : 0), goal: 1 },
];

export type EarnedMap = Record<string, number>;

const earnedKey = (uid: string) => `mm.achievements.${uid}`;
const counterKey = (uid: string) => `mm.counters.${uid}`;

export function readEarned(uid: string): EarnedMap {
  try {
    return JSON.parse(localStorage.getItem(earnedKey(uid)) ?? "{}") as EarnedMap;
  } catch {
    return {};
  }
}

export function writeEarned(uid: string, map: EarnedMap) {
  try {
    localStorage.setItem(earnedKey(uid), JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function readCounters(uid: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(counterKey(uid)) ?? "{}");
  } catch {
    return {};
  }
}

export function bumpCounter(uid: string, name: string, by = 1) {
  const c = readCounters(uid);
  c[name] = (c[name] ?? 0) + by;
  try {
    localStorage.setItem(counterKey(uid), JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

export interface AchievementState extends AchievementDef {
  unlocked: boolean;
  earnedAt?: number;
  current: number;
}

export function evaluate(stats: AchievementStats, earned: EarnedMap): AchievementState[] {
  return ACHIEVEMENTS.map((a) => {
    const current = Math.max(0, a.progress(stats));
    const unlocked = current >= a.goal || earned[a.id] != null;
    return { ...a, current: Math.min(current, a.goal), unlocked, earnedAt: earned[a.id] };
  });
}
