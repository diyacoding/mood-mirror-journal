import { format, parseISO } from "date-fns";
import { Clock } from "lucide-react";
import { MoodEntry, MOODS } from "@/lib/moodStore";

interface Props { entries: MoodEntry[] }

export const HistoryScreen = ({ entries }: Props) => {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="px-5 pt-12 pb-32 animate-fade-in">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">{sorted.length} {sorted.length === 1 ? "entry" : "entries"}</p>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-3xl bg-card border border-border p-8 text-center shadow-card">
          <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Your timeline will appear here once you log your first mood.</p>
        </div>
      ) : (
        <ol className="relative border-l border-border ml-3 space-y-4">
          {sorted.map(e => {
            const m = MOODS.find(x => x.key === e.mood)!;
            const b = e.behaviors;
            const chips = [
              b.sleepHours != null && `💤 ${b.sleepHours}h`,
              b.exerciseMinutes != null && `🏃 ${b.exerciseMinutes}m`,
              b.screenTimeHours != null && `📱 ${b.screenTimeHours}h`,
              b.productivityHours != null && `📚 ${b.productivityHours}h`,
              b.socialLevel != null && `🫂 ${["solo","quiet","some","active","very"][b.socialLevel-1]}`,
            ].filter(Boolean) as string[];
            return (
              <li key={e.date} className="ml-5">
                <span
                  className="absolute -left-[11px] flex items-center justify-center w-6 h-6 rounded-full text-sm shadow-card"
                  style={{ background: m.color }}
                >
                  {m.emoji}
                </span>
                <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{format(parseISO(e.date), "EEEE, MMM d")}</span>
                    <span className="text-xs font-medium text-primary">{e.intensity}/10</span>
                  </div>
                  <div className="font-semibold">{m.label}</div>
                  {e.note && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{e.note}</p>}
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {chips.map((c, i) => (
                        <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">{c}</span>
                      ))}
                    </div>
                  )}
                  {b.custom && b.custom.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {b.custom.map((c, i) => (
                        <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-accent text-accent-foreground">
                          {c.name}: {c.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
