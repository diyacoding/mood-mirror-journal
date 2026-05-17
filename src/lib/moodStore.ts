export type MoodKey =
  | "happy"
  | "calm"
  | "neutral"
  | "anxious"
  | "stressed"
  | "sad";

export interface MoodEntry {
  date: string;
  mood: MoodKey;
  intensity?: number;
  confidence?: number;
  note?: string;
  source?: string;
  createdAt?: string;
}

export const MOODS = [
  { key: "happy", emoji: "😊", label: "Happy" },
  { key: "calm", emoji: "😌", label: "Calm" },
  { key: "neutral", emoji: "😐", label: "Neutral" },
  { key: "anxious", emoji: "😰", label: "Anxious" },
  { key: "stressed", emoji: "😣", label: "Stressed" },
  { key: "sad", emoji: "😔", label: "Sad" },
] as const;

export const todayKey = () => {
  return new Date().toISOString().split("T")[0];
};

export const loadEntries = (): MoodEntry[] => {
  const raw = localStorage.getItem("mood_entries");
  return raw ? JSON.parse(raw) : [];
};

export const saveEntries = (entries: MoodEntry[]) => {
  localStorage.setItem("mood_entries", JSON.stringify(entries));
};

export const clearAll = () => {
  localStorage.removeItem("mood_entries");
};

export const isOnboarded = () => {
  return localStorage.getItem("onboarded") === "true";
};

export const setOnboarded = () => {
  localStorage.setItem("onboarded", "true");
};

export const getEntry = (date: string) => {
  return loadEntries().find((e) => e.date === date);
};

export const computeStreak = (entries: MoodEntry[]) => {
  return entries.length;
};

export const generateInsights = () => {
  return [
    {
      text: "More mood insights coming soon ✨",
    },
  ];
};

export const moodScore = (mood: string) => {
  const scores: Record<string, number> = {
    happy: 5,
    calm: 4,
    neutral: 3,
    anxious: 2,
    stressed: 1,
    sad: 1,
  };

  return scores[mood] ?? 3;
};
export const moodScore = (mood: string) => {
  return 3;
};
