// Mood Mirror Reflection Score + Prediction + Weekly Report analytics.
// Pure, additive utilities. No backend, no side effects.

import { format, subDays, differenceInCalendarDays } from "date-fns";
import { moodScore, type MoodEntry, type MoodKey } from "./moodTypes";

export interface ReflectionScore {
  total: number;            // 0-100
  stability: number;        // 0-100
  positivity: number;       // 0-100
  consistency: number;      // 0-100
  daysCovered: number;
  entryCount: number;
}

export interface ReflectionTrend {
  current: ReflectionScore;
  previous: ReflectionScore;
  delta: number; // current.total - previous.total
}

const inRange = (e: MoodEntry, start: Date, end: Date) => {
  const t = e.createdAt;
  return t >= start.getTime() && t < end.getTime();
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export function computeReflectionScore(entries: MoodEntry[]): ReflectionScore {
  if (!entries.length) {
    return { total: 0, stability: 0, positivity: 0, consistency: 0, daysCovered: 0, entryCount: 0 };
  }
  const scores = entries.map((e) => moodScore(e.mood));
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance =
    scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  // mood scores range 2..9 (range ~7). Lower stdDev -> higher stability.
  const stability = Math.max(0, Math.min(100, Math.round(100 - (stdDev / 3.5) * 100)));
  // avg 2..9 -> map to 0..100
  const positivity = Math.max(0, Math.min(100, Math.round(((avg - 2) / 7) * 100)));
  const uniqueDays = new Set(entries.map((e) => e.date)).size;
  const consistency = Math.max(0, Math.min(100, Math.round((uniqueDays / 7) * 100)));
  const total = Math.round(stability * 0.35 + positivity * 0.35 + consistency * 0.3);
  return { total, stability, positivity, consistency, daysCovered: uniqueDays, entryCount: entries.length };
}

export function weeklyReflectionTrend(entries: MoodEntry[]): ReflectionTrend {
  const now = new Date();
  const startCurr = startOfDay(subDays(now, 6));
  const endCurr = new Date(startOfDay(now).getTime() + 24 * 3600 * 1000);
  const startPrev = startOfDay(subDays(now, 13));
  const endPrev = startCurr;
  const curr = entries.filter((e) => inRange(e, startCurr, endCurr));
  const prev = entries.filter((e) => inRange(e, startPrev, endPrev));
  const current = computeReflectionScore(curr);
  const previous = computeReflectionScore(prev);
  return { current, previous, delta: current.total - previous.total };
}

// ---------- Prediction ----------

export interface MoodPrediction {
  predictedMood: MoodKey;
  predictedScore: number; // 1-10
  confidence: number;     // 0-100
  explanation: string;
  basedOnDays: number;
}

const NEAREST: { key: MoodKey; score: number }[] = [
  { key: "happy", score: 9 },
  { key: "calm", score: 8 },
  { key: "neutral", score: 5 },
  { key: "anxious", score: 3 },
  { key: "sad", score: 2 },
  { key: "stressed", score: 2 },
];

const nearestMood = (score: number): MoodKey => {
  let best = NEAREST[0];
  let bestDiff = Infinity;
  for (const m of NEAREST) {
    const d = Math.abs(m.score - score);
    if (d < bestDiff) { bestDiff = d; best = m; }
  }
  return best.key;
};

export function predictTomorrowMood(entries: MoodEntry[]): MoodPrediction | null {
  const now = new Date();
  const windowStart = startOfDay(subDays(now, 13));
  const recent = entries.filter((e) => e.createdAt >= windowStart.getTime());
  if (recent.length < 2) return null;

  const days = new Map<string, { scores: number[]; sleep: number[]; ex: number[]; screen: number[] }>();
  for (const e of recent) {
    const bucket = days.get(e.date) ?? { scores: [], sleep: [], ex: [], screen: [] };
    bucket.scores.push(moodScore(e.mood));
    if (e.behaviors?.sleepHours != null) bucket.sleep.push(e.behaviors.sleepHours);
    if (e.behaviors?.exerciseMinutes != null) bucket.ex.push(e.behaviors.exerciseMinutes);
    if (e.behaviors?.screenTimeHours != null) bucket.screen.push(e.behaviors.screenTimeHours);
    days.set(e.date, bucket);
  }
  const dayList = Array.from(days.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, d]) => ({
      date,
      mood: d.scores.reduce((s, v) => s + v, 0) / d.scores.length,
      sleep: d.sleep.length ? d.sleep.reduce((s, v) => s + v, 0) / d.sleep.length : null,
      ex: d.ex.length ? d.ex.reduce((s, v) => s + v, 0) / d.ex.length : null,
      screen: d.screen.length ? d.screen.reduce((s, v) => s + v, 0) / d.screen.length : null,
    }));

  // EMA-style weighted average (recent days weigh more)
  let weight = 0;
  let weighted = 0;
  dayList.forEach((d, i) => {
    const w = i + 1;
    weight += w;
    weighted += d.mood * w;
  });
  let base = weighted / weight;

  // Behavior tweaks (gentle, rule-based)
  const reasons: string[] = [];
  const recentDays = dayList.slice(-3);
  const sleepAvg = avgOfNullable(recentDays.map((d) => d.sleep));
  const exAvg = avgOfNullable(recentDays.map((d) => d.ex));
  const screenAvg = avgOfNullable(recentDays.map((d) => d.screen));
  if (sleepAvg != null) {
    if (sleepAvg >= 7.5) { base += 0.4; reasons.push("steady sleep"); }
    else if (sleepAvg < 6) { base -= 0.5; reasons.push("low sleep"); }
  }
  if (exAvg != null && exAvg >= 20) { base += 0.3; reasons.push("regular movement"); }
  if (screenAvg != null && screenAvg > 6) { base -= 0.3; reasons.push("high screen time"); }

  base = Math.max(2, Math.min(9, base));
  const predictedMood = nearestMood(base);

  // Confidence: more days + lower variance = higher confidence
  const moodVals = dayList.map((d) => d.mood);
  const mean = moodVals.reduce((s, v) => s + v, 0) / moodVals.length;
  const variance = moodVals.reduce((s, v) => s + (v - mean) ** 2, 0) / moodVals.length;
  const stability = Math.max(0, 1 - Math.sqrt(variance) / 3.5);
  const coverage = Math.min(1, dayList.length / 10);
  const confidence = Math.round(40 + stability * 40 + coverage * 20);

  const explanation = reasons.length
    ? `Based on your ${reasons.join(", ")} over the last ${dayList.length} days.`
    : `Based on your mood patterns over the last ${dayList.length} days.`;

  return {
    predictedMood,
    predictedScore: Number(base.toFixed(1)),
    confidence,
    explanation,
    basedOnDays: dayList.length,
  };
}

const avgOfNullable = (arr: (number | null)[]): number | null => {
  const vals = arr.filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
};

// ---------- Weekly Report ----------

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  totalEntries: number;
  daysLogged: number;
  averageScore: number;
  trendSummary: string;
  behaviorInsights: string[];
  biggestPositive: string;
  biggestNegative: string;
  suggestion: string;
  reflection: ReflectionScore;
}

export function generateWeeklyReport(entries: MoodEntry[]): WeeklyReport {
  const now = new Date();
  const start = startOfDay(subDays(now, 6));
  const end = new Date(startOfDay(now).getTime() + 24 * 3600 * 1000);
  const week = entries.filter((e) => inRange(e, start, end));
  const reflection = computeReflectionScore(week);

  const scores = week.map((e) => moodScore(e.mood));
  const avg = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
  const half = Math.floor(week.length / 2);
  const firstHalf = week.slice(0, half).map((e) => moodScore(e.mood));
  const secondHalf = week.slice(half).map((e) => moodScore(e.mood));
  const fAvg = firstHalf.length ? firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length : avg;
  const sAvg = secondHalf.length ? secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length : avg;
  const direction = sAvg - fAvg;

  const trendSummary = !week.length
    ? "No entries this week yet. Try a quick check-in to start your reflection."
    : direction > 0.4
      ? `Your mood has been trending upward this week, averaging ${avg.toFixed(1)}/10. Momentum is on your side.`
      : direction < -0.4
        ? `Your mood softened a bit this week, averaging ${avg.toFixed(1)}/10. Gentle care helps reset the pattern.`
        : `Your mood stayed fairly steady this week around ${avg.toFixed(1)}/10. Consistency builds clarity.`;

  // Behavior correlations
  const withBehavior = (key: keyof NonNullable<MoodEntry["behaviors"]>) =>
    week.filter((e) => e.behaviors?.[key] != null);

  const corr = (key: keyof NonNullable<MoodEntry["behaviors"]>): { avgHigh: number; avgLow: number; count: number } | null => {
    const list = withBehavior(key);
    if (list.length < 3) return null;
    const sorted = [...list].sort((a, b) => (a.behaviors![key] as number) - (b.behaviors![key] as number));
    const mid = Math.floor(sorted.length / 2);
    const low = sorted.slice(0, mid);
    const high = sorted.slice(-mid || -1);
    const avgL = low.reduce((s, e) => s + moodScore(e.mood), 0) / low.length;
    const avgH = high.reduce((s, e) => s + moodScore(e.mood), 0) / high.length;
    return { avgHigh: avgH, avgLow: avgL, count: list.length };
  };

  const behaviorInsights: string[] = [];
  const factors: { label: string; impact: number; positive: boolean }[] = [];

  const sleep = corr("sleepHours");
  if (sleep) {
    const diff = sleep.avgHigh - sleep.avgLow;
    behaviorInsights.push(
      diff > 0.3
        ? `More sleep aligned with better moods (+${diff.toFixed(1)} on average).`
        : diff < -0.3
          ? `More sleep didn't translate to better moods this week.`
          : `Sleep had a neutral effect on mood this week.`,
    );
    factors.push({ label: "good sleep", impact: Math.abs(diff), positive: diff > 0 });
  }
  const ex = corr("exerciseMinutes");
  if (ex) {
    const diff = ex.avgHigh - ex.avgLow;
    behaviorInsights.push(
      diff > 0.3
        ? `Days with more movement felt brighter (+${diff.toFixed(1)}).`
        : `Movement had a modest effect on mood this week.`,
    );
    factors.push({ label: "movement", impact: Math.abs(diff), positive: diff > 0 });
  }
  const screen = corr("screenTimeHours");
  if (screen) {
    const diff = screen.avgHigh - screen.avgLow;
    behaviorInsights.push(
      diff < -0.3
        ? `Higher screen time tracked with lower moods (${diff.toFixed(1)}).`
        : `Screen time had a mild effect this week.`,
    );
    factors.push({ label: "lower screen time", impact: Math.abs(diff), positive: diff < 0 });
  }

  factors.sort((a, b) => b.impact - a.impact);
  const positives = factors.filter((f) => f.positive);
  const negatives = factors.filter((f) => !f.positive);
  const biggestPositive = positives[0]?.label
    ? `${positives[0].label.charAt(0).toUpperCase() + positives[0].label.slice(1)} lifted your mood most.`
    : "Consistent check-ins were your biggest win.";
  const biggestNegative = negatives[0]?.label
    ? `${negatives[0].label.charAt(0).toUpperCase() + negatives[0].label.slice(1)} weighed on your mood most.`
    : "No single factor pulled your mood down sharply.";

  const suggestion = !week.length
    ? "Log a quick mood today to seed next week's insights."
    : reflection.consistency < 60
      ? "Try one more daily check-in next week — small data unlocks bigger patterns."
      : reflection.positivity < 50
        ? "Plan one small, soothing ritual each day this coming week."
        : reflection.stability < 50
          ? "Notice transitions between moods — short breathwork can smooth them."
          : "Keep the rhythm — your patterns are settling nicely.";

  return {
    startDate: format(start, "MMM d"),
    endDate: format(subDays(end, 1), "MMM d, yyyy"),
    totalEntries: week.length,
    daysLogged: new Set(week.map((e) => e.date)).size,
    averageScore: Number(avg.toFixed(1)),
    trendSummary,
    behaviorInsights,
    biggestPositive,
    biggestNegative,
    suggestion,
    reflection,
  };
}

export function lastNDaysCovered(entries: MoodEntry[], n: number): number {
  const now = new Date();
  const start = startOfDay(subDays(now, n - 1));
  const filtered = entries.filter((e) => e.createdAt >= start.getTime());
  return new Set(filtered.map((e) => e.date)).size;
}

export const _internals = { differenceInCalendarDays };
