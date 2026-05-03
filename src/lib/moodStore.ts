// Local-first store for Mood Mirror entries.
import { format } from "date-fns";

export type MoodKey = "happy" | "calm" | "neutral" | "anxious" | "stressed" | "sad";

export interface MoodEntry {
  date: string; // yyyy-MM-dd
  mood: MoodKey;
  intensity: number; // 1-10
  note?: string;
  behaviors: {
    sleepHours?: number;
    exerciseMinutes?: number;
    screenTimeHours?: number;
    socialLevel?: number; // 1-5
    productivityHours?: number;
    custom?: { name: string; value: string }[];
  };
  createdAt: number;
}

const KEY = "moodmirror.entries.v1";
const ONBOARD_KEY = "moodmirror.onboarded";

export const MOODS: { key: MoodKey; emoji: string; label: string; color: string }[] = [
  { key: "happy", emoji: "😊", label: "Happy", color: "hsl(var(--mood-happy))" },
  { key: "calm", emoji: "😌", label: "Calm", color: "hsl(var(--mood-calm))" },
  { key: "neutral", emoji: "😐", label: "Neutral", color: "hsl(var(--mood-neutral))" },
  { key: "anxious", emoji: "😰", label: "Anxious", color: "hsl(var(--mood-anxious))" },
  { key: "stressed", emoji: "😣", label: "Stressed", color: "hsl(var(--mood-stressed))" },
  { key: "sad", emoji: "😔", label: "Sad", color: "hsl(var(--mood-sad))" },
];

export const moodScore = (m: MoodKey): number => {
  const map: Record<MoodKey, number> = {
    happy: 9, calm: 8, neutral: 5, anxious: 3, stressed: 2, sad: 2,
  };
  return map[m];
};

export const todayKey = () => format(new Date(), "yyyy-MM-dd");

export const loadEntries = (): MoodEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveEntries = (entries: MoodEntry[]) => {
  localStorage.setItem(KEY, JSON.stringify(entries));
};



export const getEntry = (date: string) => loadEntries().find(e => e.date === date);

export const clearAll = () => {
  localStorage.removeItem(KEY);
  localStorage.removeItem(ONBOARD_KEY);
};

export const isOnboarded = () => localStorage.getItem(ONBOARD_KEY) === "1";
export const setOnboarded = () => localStorage.setItem(ONBOARD_KEY, "1");

export const computeStreak = (entries: MoodEntry[]): number => {
  if (!entries.length) return 0;
  const dates = new Set(entries.map(e => e.date));
  let streak = 0;
  const d = new Date();
  // If today not logged, start from yesterday so user doesn't lose streak mid-day
  if (!dates.has(format(d, "yyyy-MM-dd"))) {
    d.setDate(d.getDate() - 1);
  }
  while (dates.has(format(d, "yyyy-MM-dd"))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

export interface Insight { text: string; tone: "positive" | "neutral" | "watch" }

export const generateInsights = (entries: MoodEntry[]): Insight[] => {
  if (entries.length < 3) {
    return [{ text: "Log a few more days to unlock personal insights about your patterns.", tone: "neutral" }];
  }
  const insights: Insight[] = [];

  const withSleep = entries.filter(e => e.behaviors.sleepHours != null);
  if (withSleep.length >= 4) {
    const highSleep = withSleep.filter(e => (e.behaviors.sleepHours ?? 0) >= 7);
    const lowSleep = withSleep.filter(e => (e.behaviors.sleepHours ?? 0) < 7);
    if (highSleep.length && lowSleep.length) {
      const hi = avg(highSleep.map(e => moodScore(e.mood)));
      const lo = avg(lowSleep.map(e => moodScore(e.mood)));
      if (hi - lo >= 1) insights.push({ text: "Your mood tends to lift on days you sleep 7+ hours.", tone: "positive" });
    }
  }

  const withEx = entries.filter(e => e.behaviors.exerciseMinutes != null);
  if (withEx.length >= 4) {
    const moved = withEx.filter(e => (e.behaviors.exerciseMinutes ?? 0) >= 20);
    const rested = withEx.filter(e => (e.behaviors.exerciseMinutes ?? 0) < 20);
    if (moved.length && rested.length) {
      const hi = avg(moved.map(e => moodScore(e.mood)));
      const lo = avg(rested.map(e => moodScore(e.mood)));
      if (hi - lo >= 1) insights.push({ text: "Movement helps — mood is higher when you exercise 20+ minutes.", tone: "positive" });
    }
  }

  const withScreen = entries.filter(e => e.behaviors.screenTimeHours != null);
  if (withScreen.length >= 4) {
    const heavy = withScreen.filter(e => (e.behaviors.screenTimeHours ?? 0) >= 6);
    const light = withScreen.filter(e => (e.behaviors.screenTimeHours ?? 0) < 6);
    if (heavy.length && light.length) {
      const hi = avg(heavy.map(e => moodScore(e.mood)));
      const lo = avg(light.map(e => moodScore(e.mood)));
      if (lo - hi >= 1) insights.push({ text: "Stress tends to rise on high screen-time days.", tone: "watch" });
    }
  }

  if (!insights.length) insights.push({ text: "Keep logging — patterns will surface as your timeline grows.", tone: "neutral" });
  return insights;
};

const avg = (n: number[]) => n.reduce((a, b) => a + b, 0) / (n.length || 1);
