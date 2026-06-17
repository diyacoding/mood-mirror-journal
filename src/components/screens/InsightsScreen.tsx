import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { Sparkles, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { MOODS, moodScore, type MoodEntry } from "@/lib/moodTypes";
import { generateInsights } from "@/lib/moodAnalytics";
import {
  weeklyReflectionTrend,
  predictTomorrowMood,
  generateWeeklyReport,
} from "@/lib/reflectionAnalytics";
import { ReflectionScoreCard } from "@/components/insights/ReflectionScoreCard";
import { MoodPredictionCard } from "@/components/insights/MoodPredictionCard";
import { WeeklyReportSection } from "@/components/insights/WeeklyReportSection";

interface Props { entries: MoodEntry[] }

export const InsightsScreen = ({ entries }: Props) => {
  const insights = useMemo(() => generateInsights(entries), [entries]);
  const reflectionTrend = useMemo(() => weeklyReflectionTrend(entries), [entries]);
  const prediction = useMemo(() => predictTomorrowMood(entries), [entries]);
  const weeklyReport = useMemo(() => generateWeeklyReport(entries), [entries]);

  const last30 = useMemo(() => {
    const now = new Date();
    const days: { date: string; label: string; mood: number | null }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(now, i);
      const key = format(d, "yyyy-MM-dd");
      const dayEntries = entries.filter((x) => x.date === key);
      const avg = dayEntries.length
        ? dayEntries.reduce((s, e) => s + moodScore(e.mood), 0) / dayEntries.length
        : null;
      days.push({ date: key, label: format(d, "MMM d"), mood: avg });
    }
    return days;
  }, [entries]);

  const moodCounts = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach((e) => { map[e.mood] = (map[e.mood] || 0) + 1; });
    return MOODS.map((m) => ({ ...m, count: map[m.key] || 0 }));
  }, [entries]);

  const total = entries.length;

  return (
    <div className="px-5 pt-10 pb-32 space-y-6 animate-fade-in relative">
      <div className="absolute -top-20 -left-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />
      <header className="relative">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Patterns</p>
        <h1 className="font-display text-2xl mt-2 tracking-widest text-glow">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1 font-light">
          Gentle patterns from your last {total} {total === 1 ? "entry" : "entries"}.
        </p>
      </header>

      <ReflectionScoreCard trend={reflectionTrend} />
      <MoodPredictionCard prediction={prediction} />
      <WeeklyReportSection report={weeklyReport} />

      <div className="space-y-2">
        {insights.map((ins, i) => (
          <div key={i} className="rounded-2xl glass p-4 flex gap-3 items-start">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
            <p className="text-sm leading-relaxed font-light">{ins.text}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl glass p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">30-day mood trend</h2>
        </div>
        <div className="h-44 -mx-2">
          <ResponsiveContainer>
            <LineChart data={last30} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="moodGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(264 100% 65%)" />
                  <stop offset="100%" stopColor="hsl(285 100% 75%)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(270 60% 25%)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={5} tickLine={false} axisLine={false} />
              <YAxis domain={[1, 10]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 16, border: "1px solid hsl(270 96% 75% / 0.3)", background: "hsl(270 60% 10% / 0.95)", backdropFilter: "blur(12px)", color: "hsl(270 100% 92%)" }}
                labelStyle={{ color: "hsl(var(--accent))" }}
                formatter={(v: any) => [v?.toFixed?.(1) ?? "—", "Mood"]}
              />
              <Line type="monotone" dataKey="mood" stroke="url(#moodGradient)" strokeWidth={3} dot={{ r: 3, fill: "hsl(270 96% 75%)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "hsl(270 96% 75%)" }} connectNulls
                style={{ filter: "drop-shadow(0 0 8px hsl(270 96% 65% / 0.7))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-3xl glass p-5 shadow-card">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-4">Mood mix</h2>
        <div className="space-y-3">
          {moodCounts.map((m) => {
            const pct = total ? (m.count / total) * 100 : 0;
            return (
              <div key={m.key} className="flex items-center gap-3">
                <span className="text-xl w-6 drop-shadow-[0_0_10px_hsl(270_96%_75%/0.4)]">{m.emoji}</span>
                <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full rounded-full transition-smooth" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${m.color}, hsl(270 96% 75%))`, boxShadow: `0 0 12px ${m.color}` }} />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{m.count}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
