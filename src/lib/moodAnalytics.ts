import type { MoodEntry } from "./moodTypes";
import { moodScore } from "./moodTypes";

const dayKey = (ts: number) => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function computeStreak(entries: MoodEntry[]): number {
  if (!entries.length) return 0;
  const dates = new Set(entries.map((e) => e.date));
  const d = new Date();
  let streak = 0;
  if (!dates.has(dayKey(d.getTime()))) {
    d.setDate(d.getDate() - 1);
  }
  while (dates.has(dayKey(d.getTime()))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export interface Insight {
  text: string;
  tone: "positive" | "neutral" | "watch";
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

export function generateInsights(entries: MoodEntry[]): Insight[] {
  if (entries.length < 3) {
    return [{ text: "Keep logging — patterns will appear as your data grows.", tone: "neutral" }];
  }

  const out: Insight[] = [];
  const scored = entries.map((e) => ({ ...e, s: moodScore(e.mood) }));
  const recent7 = scored.slice(0, 7);
  const recentAvg = avg(recent7.map((e) => e.s));

  if (recentAvg >= 7) {
    out.push({ text: "Your last week has been mostly positive — keep it up!", tone: "positive" });
  } else if (recentAvg <= 4) {
    out.push({ text: "Recent days have felt heavy. Be gentle with yourself.", tone: "watch" });
  } else {
    out.push({ text: "Your mood has been balanced this past week.", tone: "neutral" });
  }

  const sleep = entries.filter((e) => e.behaviors?.sleepHours != null);
  if (sleep.length >= 4) {
    const good = sleep.filter((e) => (e.behaviors!.sleepHours ?? 0) >= 7);
    const bad = sleep.filter((e) => (e.behaviors!.sleepHours ?? 0) < 7);
    if (good.length && bad.length && avg(good.map((e) => moodScore(e.mood))) - avg(bad.map((e) => moodScore(e.mood))) >= 1) {
      out.push({ text: "Your mood improves on nights you sleep 7+ hours.", tone: "positive" });
    }
  }

  const ex = entries.filter((e) => e.behaviors?.exerciseMinutes != null);
  if (ex.length >= 4) {
    const a = ex.filter((e) => (e.behaviors!.exerciseMinutes ?? 0) >= 20);
    const b = ex.filter((e) => (e.behaviors!.exerciseMinutes ?? 0) < 20);
    if (a.length && b.length && avg(a.map((e) => moodScore(e.mood))) - avg(b.map((e) => moodScore(e.mood))) >= 1) {
      out.push({ text: "Exercise is linked with better mood days.", tone: "positive" });
    }
  }

  return out;
}
