import { useMemo } from "react";
import { format } from "date-fns";
import { Flame, Plus, Sparkles, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOODS, moodMeta } from "@/lib/moodTypes";
import { computeStreak, generateInsights } from "@/lib/moodAnalytics";
import type { MoodEntry } from "@/lib/moodTypes";
import type { Screen } from "../BottomNav";
import { todayKey } from "@/lib/moodApi";

interface Props {
  entries: MoodEntry[];
  loading: boolean;
  onNavigate: (s: Screen) => void;
  onLogToday: () => void;
}

export const HomeScreen = ({ entries, loading, onNavigate, onLogToday }: Props) => {
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const today = entries.find((e) => e.date === todayKey());
  const todayMood = today ? moodMeta(today.mood) : null;
  const insights = useMemo(() => generateInsights(entries), [entries]);
  const recent = entries.slice(0, 5);

  return (
    <div className="px-5 pt-12 pb-32 space-y-6 animate-fade-in">
      <header>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMM d")}</p>
        <h1 className="text-2xl font-semibold mt-1">
          {todayMood ? `Feeling ${todayMood.label.toLowerCase()} today ${todayMood.emoji}` : "How are you today?"}
        </h1>
      </header>

      <div className="rounded-3xl gradient-primary p-5 shadow-glow relative overflow-hidden text-primary-foreground">
        <div className="absolute -right-6 -top-6 text-7xl opacity-20">🔥</div>
        <div className="flex items-center gap-3 relative">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="text-3xl font-semibold leading-none">{streak}</div>
            <div className="text-xs opacity-90 mt-1">day streak · keep it gentle</div>
          </div>
        </div>
      </div>

      {!today ? (
        <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
          <h2 className="font-semibold mb-1">Log today's mood</h2>
          <p className="text-sm text-muted-foreground mb-4">A 30-second check-in goes a long way.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={onLogToday} className="rounded-2xl gradient-primary text-primary-foreground border-0 shadow-glow">
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
              <p className="font-medium mt-1">
                {todayMood?.label} · intensity {today.intensity}/10
              </p>
            </div>
            <span className="text-4xl">{todayMood?.emoji}</span>
          </div>
          <Button onClick={onLogToday} variant="ghost" size="sm" className="mt-3 rounded-full">
            Add another entry
          </Button>
        </div>
      )}

      <div className="rounded-3xl bg-accent/60 border border-accent p-5">
        <div className="flex items-center gap-2 mb-2 text-accent-foreground">
          <Sparkles className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Today's insight</h3>
        </div>
        <p className="text-sm text-accent-foreground/90 leading-relaxed">{insights[0].text}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading recent entries…</p>
      ) : recent.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent</h3>
            <button onClick={() => onNavigate("history")} className="text-xs text-primary font-medium">
              See all
            </button>
          </div>
          <div className="space-y-2">
            {recent.map((e) => {
              const m = moodMeta(e.mood);
              return (
                <div key={e.id} className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3 shadow-card">
                  <span className="text-2xl">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(e.createdAt), "EEE, MMM d · p")}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{e.intensity}/10</div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
};
