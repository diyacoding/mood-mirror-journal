import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Flame, Plus, Sparkles, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoodEntry, MOODS, computeStreak, todayKey, generateInsights } from "@/lib/moodStore";
import type { Screen } from "../BottomNav";

interface Props {
  entries: MoodEntry[];
  onNavigate: (s: Screen) => void;
  onLogToday: () => void;
}

export const HomeScreen = ({ entries, onNavigate, onLogToday }: Props) => {
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const today = entries.find(e => e.date === todayKey());
  const todayMood = today ? MOODS.find(m => m.key === today.mood) : null;
  const insights = useMemo(() => generateInsights(entries), [entries]);
  const recent = entries.slice(-5).reverse();

  return (
    <div className="px-5 pt-12 pb-32 space-y-6 animate-fade-in">
      <header>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMM d")}</p>
        <h1 className="text-2xl font-semibold mt-1">
          {todayMood ? `Feeling ${todayMood.label.toLowerCase()} today ${todayMood.emoji}` : "How are you today?"}
        </h1>
      </header>

      {/* Streak card */}
      <div className="rounded-3xl gradient-meadow p-5 shadow-soft relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-7xl opacity-20">🔥</div>
        <div className="flex items-center gap-3 relative">
          <div className="h-12 w-12 rounded-2xl bg-card/70 backdrop-blur flex items-center justify-center">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-3xl font-semibold leading-none">{streak}</div>
            <div className="text-xs text-foreground/70 mt-1">day streak · keep it gentle</div>
          </div>
        </div>
      </div>

      {/* Today CTA */}
      {!today ? (
        <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
          <h2 className="font-semibold mb-1">Log today's mood</h2>
          <p className="text-sm text-muted-foreground mb-4">A 30-second check-in goes a long way.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={onLogToday} className="rounded-2xl gradient-sky text-primary-foreground border-0 shadow-glow hover:opacity-95">
              <Plus className="h-4 w-4 mr-1" /> Log mood
            </Button>
            <Button onClick={() => onNavigate("scan")} variant="outline" className="rounded-2xl">
              <Camera className="h-4 w-4 mr-1" /> Scan face
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Today</p>
              <p className="font-medium mt-1">{todayMood?.label} · intensity {today.intensity}/10</p>
            </div>
            <span className="text-4xl">{todayMood?.emoji}</span>
          </div>
          <Button onClick={onLogToday} variant="ghost" size="sm" className="mt-3 rounded-full">
            Update entry
          </Button>
        </div>
      )}

      {/* Insight */}
      <div className="rounded-3xl bg-accent/60 border border-accent p-5">
        <div className="flex items-center gap-2 mb-2 text-accent-foreground">
          <Sparkles className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Today's insight</h3>
        </div>
        <p className="text-sm text-accent-foreground/90 leading-relaxed">{insights[0].text}</p>
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent</h3>
            <button onClick={() => onNavigate("history")} className="text-xs text-primary font-medium">
              See all
            </button>
          </div>
          <div className="space-y-2">
            {recent.map(e => {
              const m = MOODS.find(x => x.key === e.mood)!;
              return (
                <div key={e.date} className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3 shadow-card">
                  <span className="text-2xl">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{format(parseISO(e.date), "EEE, MMM d")}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{e.intensity}/10</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
