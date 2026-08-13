import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { moodMeta } from "@/lib/moodTypes";
import type { MoodEntry } from "@/lib/moodTypes";
import { useIcons } from "@/lib/iconSets";
import { cn } from "@/lib/utils";

interface Props {
  entries: MoodEntry[];
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export const CalendarScreen = ({ entries }: Props) => {
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, MoodEntry[]>();
    entries.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [entries]);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) }),
    [cursor],
  );
  const leadingBlanks = startOfMonth(cursor).getDay();
  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
  const selectedEntries = selected ? (byDate.get(selected) ?? []) : [];

  return (
    <div className="px-5 pt-10 pb-32 space-y-6 animate-fade-in relative">
      <div className="absolute -top-20 -left-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />

      <header className="relative">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Your patterns</p>
        <h1 className="font-display text-2xl mt-1 text-glow tracking-widest">Mood Calendar</h1>
      </header>

      <section className="rounded-3xl glass-strong p-5 shadow-glow">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label="Previous month"
            className="h-9 w-9 rounded-full glass flex items-center justify-center text-accent transition-smooth hover:ring-glow"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="font-display text-lg tracking-widest">{format(cursor, "MMMM yyyy")}</div>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
            className="h-9 w-9 rounded-full glass flex items-center justify-center text-accent transition-smooth hover:ring-glow"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b${i}`} />
          ))}
          {days.map((d) => {
            const k = dayKey(d);
            const list = byDate.get(k) ?? [];
            const top = list[0];
            const isToday = isSameDay(d, new Date());
            return (
              <button
                key={k}
                onClick={() => list.length && setSelected(k)}
                className={cn(
                  "aspect-square rounded-2xl flex flex-col items-center justify-center transition-smooth",
                  list.length ? "glass hover:scale-105" : "opacity-50",
                  isToday && "ring-1 ring-accent/60",
                )}
              >
                <span className="text-[9px] text-muted-foreground leading-none">{format(d, "d")}</span>
                {top ? (
                  <span className="text-lg leading-none mt-0.5">{icons.mood(top.mood)}</span>
                ) : (
                  <span className="h-[18px]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-muted-foreground font-light text-center">
        Tap a day with a sticker to see the full reflection.
      </p>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="glass-strong max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display tracking-widest">
              {selected ? format(new Date(`${selected}T00:00:00`), "EEEE, MMM d") : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedEntries.map((e) => {
              const m = moodMeta(e.mood);
              const b = e.behaviors ?? {};
              return (
                <div key={e.id} className="rounded-2xl glass p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{icons.mood(m.key)}</span>
                    <div className="flex-1">
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(e.createdAt), "p")} · intensity {e.intensity}/10
                      </div>
                    </div>
                  </div>
                  {e.note ? (
                    <p className="text-sm text-foreground/90 font-light leading-relaxed">{e.note}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-light">No reflection note.</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] text-accent/90">
                    {b.sleepHours ? <span className="rounded-full glass px-2 py-1">😴 {b.sleepHours}h sleep</span> : null}
                    {b.exerciseMinutes ? <span className="rounded-full glass px-2 py-1">🏃 {b.exerciseMinutes}m exercise</span> : null}
                    {b.screenTimeHours ? <span className="rounded-full glass px-2 py-1">📱 {b.screenTimeHours}h screen</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
