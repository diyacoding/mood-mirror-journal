import { useMemo } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Sparkles, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { MoodEntry, generateInsights, moodScore, MOODS } from "@/lib/moodStore";

interface Props { entries: MoodEntry[] }

export const InsightsScreen = ({ entries }: Props) => {
  const insights = useMemo(() => generateInsights(entries), [entries]);

  const last30 = useMemo(() => {
    const now = new Date();
    const days: { date: string; label: string; mood: number | null }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(now, i);
      const key = format(d, "yyyy-MM-dd");
      const e = entries.find(x => x.date === key);
      days.push({
        date: key,
        label: format(d, "MMM d"),
        mood: e ? moodScore(e.mood) : null,
      });
    }
    return days;
  }, [entries]);

  const sleepScatter = useMemo(
    () => entries.filter(e => e.behaviors.sleepHours != null)
      .map(e => ({ x: e.behaviors.sleepHours!, y: moodScore(e.mood) })),
    [entries]
  );
  const exerciseScatter = useMemo(
    () => entries.filter(e => e.behaviors.exerciseMinutes != null)
      .map(e => ({ x: e.behaviors.exerciseMinutes!, y: moodScore(e.mood) })),
    [entries]
  );

  const moodCounts = useMemo(() => {
    const map: Record<string, number> = {};
    entries.forEach(e => { map[e.mood] = (map[e.mood] || 0) + 1; });
    return MOODS.map(m => ({ ...m, count: map[m.key] || 0 }));
  }, [entries]);

  const total = entries.length;

  return (
    <div className="px-5 pt-12 pb-32 space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">Gentle patterns from your last {total} {total === 1 ? "entry" : "entries"}.</p>
      </header>

      {/* Insights cards */}
      <div className="space-y-2">
        {insights.map((ins, i) => (
          <div
            key={i}
            className="rounded-2xl border p-4 flex gap-3 items-start"
            style={{
              background: ins.tone === "positive" ? "hsl(var(--secondary))" : ins.tone === "watch" ? "hsl(var(--accent))" : "hsl(var(--muted))",
              borderColor: "transparent",
            }}
          >
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed">{ins.text}</p>
          </div>
        ))}
      </div>

      {/* Mood trend */}
      <section className="rounded-3xl bg-card border border-border p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">30-day mood trend</h2>
        </div>
        <div className="h-44 -mx-2">
          <ResponsiveContainer>
            <LineChart data={last30} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={5} tickLine={false} axisLine={false} />
              <YAxis domain={[1, 10]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(v: any) => [v ?? "—", "Mood"]}
              />
              <Line type="monotone" dataKey="mood" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Mood distribution */}
      <section className="rounded-3xl bg-card border border-border p-5 shadow-card">
        <h2 className="font-semibold mb-3">Mood mix</h2>
        <div className="space-y-2">
          {moodCounts.map(m => {
            const pct = total ? (m.count / total) * 100 : 0;
            return (
              <div key={m.key} className="flex items-center gap-3">
                <span className="text-xl w-6">{m.emoji}</span>
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-smooth" style={{ width: `${pct}%`, background: m.color }} />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{m.count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Correlations */}
      {sleepScatter.length >= 3 && (
        <CorrelationCard title="Sleep vs mood" xLabel="Sleep (hrs)" data={sleepScatter} />
      )}
      {exerciseScatter.length >= 3 && (
        <CorrelationCard title="Exercise vs mood" xLabel="Exercise (min)" data={exerciseScatter} />
      )}
    </div>
  );
};

const CorrelationCard = ({ title, xLabel, data }: { title: string; xLabel: string; data: { x: number; y: number }[] }) => (
  <section className="rounded-3xl bg-card border border-border p-5 shadow-card">
    <h2 className="font-semibold mb-3">{title}</h2>
    <div className="h-44 -mx-2">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={xLabel} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <YAxis type="number" dataKey="y" domain={[1, 10]} name="Mood" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
          <ZAxis range={[60, 60]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
          />
          <Scatter data={data} fill="hsl(var(--primary))" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
    <p className="text-xs text-muted-foreground mt-2">Each dot is one day.</p>
  </section>
);
