import { format } from "date-fns";
import { Trophy } from "lucide-react";
import type { AchievementState } from "@/hooks/useAchievements";
import { cn } from "@/lib/utils";

interface Props {
  achievements: AchievementState[];
}

const CATEGORIES = ["Mood Logging", "Pet", "Reflection", "Connections"] as const;

export const AchievementsScreen = ({ achievements }: Props) => {
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="px-5 pt-10 pb-32 space-y-6 animate-fade-in relative">
      <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />

      <header className="relative">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Milestones</p>
        <h1 className="font-display text-2xl mt-1 text-glow tracking-widest">Achievements</h1>
      </header>

      <section className="rounded-3xl glass-strong p-6 shadow-glow flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <Trophy className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <div className="font-display text-4xl leading-none text-glow">
            {unlocked}
            <span className="text-lg opacity-70">/{achievements.length}</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] opacity-80 mt-2">badges earned</div>
        </div>
      </section>

      {CATEGORIES.map((cat) => {
        const list = achievements.filter((a) => a.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat} className="space-y-3">
            <h2 className="font-display text-sm tracking-[0.25em] uppercase">{cat}</h2>
            <div className="space-y-2">
              {list.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-2xl glass px-4 py-3 flex items-center gap-3 transition-smooth",
                    a.unlocked ? "ring-glow" : "opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-2xl",
                      a.unlocked ? "bg-accent/15 ring-1 ring-accent/40" : "bg-muted/20 grayscale",
                    )}
                  >
                    {a.unlocked ? a.badge : "🔒"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.name}</div>
                    <p className="text-xs text-muted-foreground font-light">{a.description}</p>
                    {a.unlocked ? (
                      <p className="text-[10px] uppercase tracking-widest text-accent/80 mt-1">
                        {a.earnedAt ? `Earned ${format(new Date(a.earnedAt), "MMM d, yyyy")}` : "Earned"}
                      </p>
                    ) : (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full gradient-primary"
                            style={{ width: `${Math.min(100, (a.current / a.goal) * 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {a.current} / {a.goal}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};
