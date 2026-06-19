import { useMemo } from "react";
import { format } from "date-fns";
import { Flame, Plus, Sparkles, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moodMeta } from "@/lib/moodTypes";
import { computeStreak, generateInsights } from "@/lib/moodAnalytics";
import type { MoodEntry } from "@/lib/moodTypes";
import type { Screen } from "../BottomNav";
import { todayKey } from "@/lib/moodApi";
import logo from "@/assets/mood-mirror-logo-clean.png";

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
    <div className="px-5 pt-10 pb-32 space-y-6 animate-fade-in relative">
      {/* Ambient glow */}
      <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />

      <header className="relative">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">{format(new Date(), "EEEE · MMM d")}</p>
        <h1 className="font-display text-2xl mt-2 text-glow">
          {todayMood ? `${todayMood.label} ${todayMood.emoji}` : "Reflect today"}
        </h1>
      </header>
      <div className="flex flex-col items-center mb-2">
        <img
          src={logo}
          alt="Mood Mirror"
          className="w-56 mb-4 object-contain border-0 bg-transparent drop-shadow-[0_0_25px_rgba(168,85,247,0.55)]"
          style={{ mixBlendMode: "normal" }}
        />
        <p className="text-purple-200/70 text-center text-sm">
          Reflect. Track. Understand yourself.
        </p>
      </div>
      {/* Streak — luxe glass card */}
      <div className="relative rounded-3xl glass-strong p-6 shadow-glow overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full gradient-glow blur-2xl" />
        <div className="flex items-center gap-4 relative">
          <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
            <Flame className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-4xl leading-none text-glow">{streak}</div>
            <div className="text-[11px] uppercase tracking-[0.2em] opacity-80 mt-2">day streak · keep reflecting</div>
          </div>
        </div>
      </div>

      {!today ? (
        <div className="rounded-3xl glass p-6 shadow-card">
          <h2 className="font-display text-lg mb-1 tracking-wider">Today's reflection</h2>
          <p className="text-sm text-muted-foreground mb-5 font-light">A 30-second check-in goes a long way.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={onLogToday} className="rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-12">
              <Plus className="h-4 w-4 mr-1" /> Log mood
            </Button>
            <Button onClick={() => onNavigate("scan")} variant="outline" className="rounded-full h-12 glass border-accent/30 hover:border-accent/60 text-foreground">
              <Camera className="h-4 w-4 mr-1" /> Scan face
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl glass p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-accent/80 uppercase tracking-[0.25em]">Today</p>
              <p className="font-display text-lg mt-1 tracking-wider">
                {todayMood?.label} · {today.intensity}/10
              </p>
            </div>
            <span className="text-5xl drop-shadow-[0_0_20px_hsl(270_96%_75%/0.6)]">{todayMood?.emoji}</span>
          </div>
          <Button onClick={onLogToday} variant="ghost" size="sm" className="mt-3 rounded-full text-accent hover:text-accent hover:bg-accent/10">
            Add another entry
          </Button>
        </div>
      )}

      <div className="rounded-3xl glass p-5 border-accent/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">Today's insight</h3>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed font-light">{insights[0].text}</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading recent entries…</p>
      ) : recent.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm tracking-[0.25em] uppercase">Recent</h3>
            <button onClick={() => onNavigate("history")} className="text-xs text-accent font-medium tracking-wider">
              See all
            </button>
          </div>
          <div className="space-y-2">
            {recent.map((e) => {
              const m = moodMeta(e.mood);
              return (
                <div key={e.id} className="rounded-2xl glass px-4 py-3 flex items-center gap-3 transition-smooth hover:ring-glow">
                  <span className="text-2xl drop-shadow-[0_0_12px_hsl(270_96%_75%/0.4)]">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(e.createdAt), "EEE, MMM d · p")}</div>
                  </div>
                  <div className="text-xs text-accent/80">{e.intensity}/10</div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
};
