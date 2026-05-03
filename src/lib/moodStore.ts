// Mood Mirror — UI + analytics helpers (Firebase is source of truth)

import { format } from "date-fns";

/* -------------------- TYPES -------------------- */

export type MoodKey =
  | "happy"
  | "calm"
  | "neutral"
  | "anxious"
  | "stressed"
  | "sad";

export interface MoodEntry {
  date: string; // yyyy-MM-dd
  mood: MoodKey;
  intensity: number; // 1-10
  note?: string;

  behaviors: {
    sleepHours?: number;
    exerciseMinutes?: number;
    screenTimeHours?: number;
    socialLevel?: number;
    productivityHours?: number;
    custom?: { name: string; value: string }[];
  };

  createdAt: number;
}

/* -------------------- MOODS (UI ONLY) -------------------- */

export const MOODS: {
  key: MoodKey;
  emoji: string;
  label: string;
  color: string;
}[] = [
  { key: "happy", emoji: "😊", label: "Happy", color: "hsl(var(--mood-happy))" },
  { key: "calm", emoji: "😌", label: "Calm", color: "hsl(var(--mood-calm))" },
  { key: "neutral", emoji: "😐", label: "Neutral", color: "hsl(var(--mood-neutral))" },
  { key: "anxious", emoji: "😰", label: "Anxious", color: "hsl(var(--mood-anxious))" },
  { key: "stressed", emoji: "😣", label: "Stressed", color: "hsl(var(--mood-stressed))" },
  { key: "sad", emoji: "😔", label: "Sad", color: "hsl(var(--mood-sad))" },
];

/* -------------------- ANALYTICS -------------------- */

export const moodScore = (m: MoodKey): number => {
  const map: Record<MoodKey, number> = {
    happy: 9,
    calm: 8,
    neutral: 5,
    anxious: 3,
    stressed: 2,
    sad: 2,
  };

  return map[m];
};

export const computeStreak = (entries: MoodEntry[]): number => {
  if (!entries.length) return 0;

  const dates = new Set(entries.map((e) => e.date));
  let streak = 0;

  const d = new Date();

  // If today not logged, start from yesterday
  if (!dates.has(format(d, "yyyy-MM-dd"))) {
    d.setDate(d.getDate() - 1);
  }

  while (dates.has(format(d, "yyyy-MM-dd"))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  return streak;
};

export interface Insight {
  text: string;
  tone: "positive" | "neutral" | "watch";
}

export const generateInsights = (entries: MoodEntry[]): Insight[] => {
  if (entries.length < 3) {
    return [
      {
        text: "Keep logging — patterns will appear as your data grows.",
        tone: "neutral",
      },
    ];
  }

  const insights: Insight[] = [];

  /* ---------------- Sleep Insight ---------------- */
  const sleepEntries = entries.filter((e) => e.behaviors.sleepHours != null);

  if (sleepEntries.length >= 4) {
    const good = sleepEntries.filter((e) => (e.behaviors.sleepHours ?? 0) >= 7);
    const bad = sleepEntries.filter((e) => (e.behaviors.sleepHours ?? 0) < 7);

    if (good.length && bad.length) {
      const goodAvg = avg(good.map((e) => moodScore(e.mood)));
      const badAvg = avg(bad.map((e) => moodScore(e.mood)));

      if (goodAvg - badAvg >= 1) {
        insights.push({
          text: "Your mood improves on nights you sleep 7+ hours.",
          tone: "positive",
        });
      }
    }
  }

  /* ---------------- Exercise Insight ---------------- */
  const exEntries = entries.filter((e) => e.behaviors.exerciseMinutes != null);

  if (exEntries.length >= 4) {
    const active = exEntries.filter((e) => (e.behaviors.exerciseMinutes ?? 0) >= 20);
    const inactive = exEntries.filter((e) => (e.behaviors.exerciseMinutes ?? 0) < 20);

    if (active.length && inactive.length) {
      const activeAvg = avg(active.map((e) => moodScore(e.mood)));
      const inactiveAvg = avg(inactive.map((e) => moodScore(e.mood)));

      if (activeAvg - inactiveAvg >= 1) {
        insights.push({
          text: "Exercise is linked with better mood days.",
          tone: "positive",
        });
      }
    }
  }

  /* ---------------- Screen Time Insight ---------------- */
  const screenEntries = entries.filter(
    (e) => e.behaviors.screenTimeHours != null
  );

  if (screenEntries.length >= 4) {
    const heavy = screenEntries.filter((e) => (e.behaviors.screenTimeHours ?? 0) >= 6);
    const light = screenEntries.filter((e) => (e.behaviors.screenTimeHours ?? 0) < 6);

    if (heavy.length && light.length) {
      const heavyAvg = avg(heavy.map((e) => moodScore(e.mood)));
      const lightAvg = avg(light.map((e) => moodScore(e.mood)));

      if (lightAvg - heavyAvg >= 1) {
        insights.push({
          text: "High screen time may be linked to lower mood.",
          tone: "watch",
        });
      }
    }
  }

  if (!insights.length) {
    insights.push({
      text: "Keep logging — your patterns are still forming.",
      tone: "neutral",
    });
  }

  return insights;
};

/* -------------------- UTIL -------------------- */

const avg = (arr: number[]) =>
  arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
