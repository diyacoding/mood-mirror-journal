// Shared mood domain types & constants

export type MoodKey =
  | "happy"
  | "calm"
  | "neutral"
  | "anxious"
  | "stressed"
  | "sad";

export interface MoodBehaviors {
  sleepHours?: number;
  exerciseMinutes?: number;
  screenTimeHours?: number;
  socialLevel?: number;
  productivityHours?: number;
}

export interface MoodEntry {
  id: string;
  mood: MoodKey;
  intensity: number; // 1-10
  note?: string;
  source: "manual" | "scan";
  confidence?: number;
  behaviors?: MoodBehaviors;
  date: string; // yyyy-MM-dd
  createdAt: number; // ms epoch
}

export interface MoodMeta {
  key: MoodKey;
  emoji: string;
  label: string;
  color: string; // CSS color
}

export const MOODS: MoodMeta[] = [
  { key: "happy", emoji: "😊", label: "Happy", color: "hsl(var(--mood-happy))" },
  { key: "calm", emoji: "😌", label: "Calm", color: "hsl(var(--mood-calm))" },
  { key: "neutral", emoji: "😐", label: "Neutral", color: "hsl(var(--mood-neutral))" },
  { key: "anxious", emoji: "😰", label: "Anxious", color: "hsl(var(--mood-anxious))" },
  { key: "stressed", emoji: "😣", label: "Stressed", color: "hsl(var(--mood-stressed))" },
  { key: "sad", emoji: "😔", label: "Sad", color: "hsl(var(--mood-sad))" },
];

export const moodMeta = (k: MoodKey) => MOODS.find((m) => m.key === k)!;

export const moodScore = (m: MoodKey): number => {
  const map: Record<MoodKey, number> = {
    happy: 9, calm: 8, neutral: 5, anxious: 3, stressed: 2, sad: 2,
  };
  return map[m];
};
