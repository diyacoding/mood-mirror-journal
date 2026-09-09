import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/usePreferences";
import { accessoryMeta, isCustomAccessory } from "@/lib/petTypes";
import type { AccessoryId, PetItem } from "@/lib/petTypes";
import { useIcons } from "@/lib/iconSets";
import { cn } from "@/lib/utils";

interface Props {
  /** Pets in any order — the scrapbook sorts oldest → newest itself. */
  pets: PetItem[];
  points: number;
  /** Custom accessory art keyed by accessory id. */
  customArt?: Record<string, string>;
  onClose: () => void;
  /** Called by the empty-state button (send the user to mood logging). */
  onLogMood?: () => void;
}

const fmtDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "Date unknown";

export const PetScrapbook = ({ pets, points, customArt = {}, onClose, onLogMood }: Props) => {
  const { prefs } = usePreferences();
  const icons = useIcons();

  // Oldest → newest. Never mutate the incoming array.
  const ordered = useMemo(
    () => [...pets].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
    [pets],
  );

  // Pages = every pet, plus one trailing locked page.
  const pageCount = ordered.length + 1;
  // Open on the newest pet (or the locked/empty page when there are none).
  const [index, setIndex] = useState(Math.max(0, ordered.length - 1));
  const [dir, setDir] = useState<"next" | "prev" | null>(null);
  const [drag, setDrag] = useState<{ x: number; dx: number } | null>(null);

  useEffect(() => {
    setIndex((i) => Math.min(i, pageCount - 1));
  }, [pageCount]);

  const go = (delta: number) => {
    const next = index + delta;
    if (next < 0 || next > pageCount - 1) return;
    setDir(delta > 0 ? "next" : "prev");
    setIndex(next);
  };

  const toNextPet = 100 - (points % 100);
  const progress = ((100 - toNextPet) / 100) * 100;
  const pet = ordered[index] ?? null;
  const animate = !prefs.reduceMotion && dir;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/85 backdrop-blur-md px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Pet Scrapbook</p>
          <h2 className="font-display text-xl tracking-widest">
            {ordered.length} page{ordered.length === 1 ? "" : "s"} of memories
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close scrapbook"
          className="h-10 w-10 rounded-full glass flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="relative flex-1 min-h-0 flex items-center"
        onTouchStart={(e) => setDrag({ x: e.touches[0].clientX, dx: 0 })}
        onTouchMove={(e) => drag && setDrag({ ...drag, dx: e.touches[0].clientX - drag.x })}
        onTouchEnd={() => {
          if (drag && Math.abs(drag.dx) > 50) go(drag.dx < 0 ? 1 : -1);
          setDrag(null);
        }}
      >
        {/* Notebook page */}
        <article
          key={index}
          className={cn(
            "relative w-full max-h-full overflow-y-auto rounded-3xl border border-border/60 shadow-glow",
            "bg-[hsl(var(--card))] pl-8 pr-5 py-6",
            animate && (dir === "next" ? "animate-slide-in-right" : "animate-scale-in"),
          )}
          style={
            drag && !prefs.reduceMotion
              ? { transform: `translateX(${drag.dx / 3}px)` }
              : undefined
          }
        >
          {/* Spine + binding rings */}
          <div className="absolute left-0 top-0 bottom-0 w-8 rounded-l-3xl bg-accent/10 border-r border-dashed border-border/70" />
          <div className="absolute left-3 top-0 bottom-0 flex flex-col justify-evenly">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-accent/40" />
            ))}
          </div>

          {pet ? (
            <div className="space-y-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Page {index + 1} · {fmtDate(pet.createdAt)}
              </p>
              <div className="mx-auto w-52 h-52 rounded-3xl glass flex items-center justify-center p-3">
                <img
                  src={pet.imageDataUrl}
                  alt={pet.name ?? "Pet drawing"}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="font-display text-2xl tracking-wider">{pet.name ?? "Unnamed friend"}</h3>
              <p className="text-xs italic text-muted-foreground">
                “hatched with love on {fmtDate(pet.createdAt)}”
              </p>

              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-accent/80 mb-2">
                  Accessories
                </p>
                {(pet.accessories ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No accessories yet</p>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {(pet.accessories ?? []).map((a: AccessoryId) => {
                      const custom = isCustomAccessory(a);
                      if (custom && !customArt[a]) return null;
                      return (
                        <span
                          key={a}
                          className="rounded-full px-3 py-1.5 text-xs glass flex items-center gap-1.5"
                        >
                          {custom ? (
                            <img src={customArt[a]} alt="" className="h-5 w-5 object-contain" />
                          ) : (
                            <span className="text-base">{icons.accessory(a as any)}</span>
                          )}
                          {custom ? "My drawing" : accessoryMeta(a as any).label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : ordered.length === 0 ? (
            <div className="space-y-4 text-center py-10">
              <div className="text-5xl">🐣</div>
              <h3 className="font-display text-xl tracking-wider">
                Your scrapbook is waiting for its first page!
              </h3>
              <p className="text-sm text-muted-foreground">
                Log your first mood to hatch your egg and create your first pet.
              </p>
              {onLogMood && (
                <Button
                  onClick={() => {
                    onClose();
                    onLogMood();
                  }}
                  className="rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-11 px-6"
                >
                  Log a mood
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-5 text-center py-10">
              <div className="mx-auto h-16 w-16 rounded-full glass flex items-center justify-center">
                <Lock className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-display text-xl tracking-[0.2em] uppercase">To be unlocked</h3>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4 text-accent" /> Your next pet is waiting!
              </p>
              <p className="text-sm text-muted-foreground">
                Gain more points to unlock your next pet.
              </p>
              <div className="max-w-xs mx-auto space-y-1">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>{points % 100} / 100 points</span>
                  <span>{toNextPet} more to go</span>
                </div>
                <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                  <div className="h-full gradient-primary" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          )}
        </article>
      </div>

      <div className="flex items-center justify-between gap-3 mt-4">
        <Button
          variant="outline"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded-full glass h-11 px-5"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Older
        </Button>
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {index + 1} / {pageCount}
        </p>
        <Button
          variant="outline"
          onClick={() => go(1)}
          disabled={index >= pageCount - 1}
          className="rounded-full glass h-11 px-5"
        >
          Newer <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
