import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/hooks/usePreferences";
import { accessoryMeta, isCustomAccessory } from "@/lib/petTypes";
import type { AccessoryId, PetItem } from "@/lib/petTypes";
import { useIcons } from "@/lib/iconSets";
import { cn } from "@/lib/utils";
import { playPageFlip } from "@/lib/audioEngine";

interface Props {
  /** Pets in any order — the scrapbook sorts oldest → newest itself. */
  pets: PetItem[];
  points: number;
  /** Custom accessory art keyed by accessory id. */
  customArt?: Record<string, string>;
  onClose: () => void;
  /** Text for the close action (defaults to a plain X). */
  closeLabel?: string;
  /** Called by the empty-state button (send the user to mood logging). */
  onLogMood?: () => void;
}

type TurnDirection = "next" | "prev";
type TurnState = {
  direction: TurnDirection;
  progress: number;
  pointerId: number | null;
  startX: number;
  completing: boolean;
  cancelling: boolean;
};

const fmtDate = (ts?: number) =>
  ts
    ? new Date(ts).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "Date unknown";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export const PetScrapbook = ({ pets, points, customArt = {}, onClose, closeLabel, onLogMood }: Props) => {
  const { prefs } = usePreferences();
  const icons = useIcons();
  const bookRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<number | null>(null);

  // Oldest → newest. Never mutate the incoming array.
  const ordered = useMemo(
    () => [...pets].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
    [pets],
  );

  // Pages = every pet, plus one trailing locked page.
  const pageCount = ordered.length + 1;
  // Open on the newest pet (or the locked/empty page when there are none).
  const [index, setIndex] = useState(Math.max(0, ordered.length - 1));
  const [turn, setTurn] = useState<TurnState | null>(null);

  useEffect(() => {
    setIndex((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => () => {
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
  }, []);

  const canTurn = (direction: TurnDirection) =>
    direction === "next" ? index < pageCount - 1 : index > 0;

  const settleTurn = (direction: TurnDirection, completed: boolean) => {
    setTurn((current) => current ? {
      ...current,
      progress: completed ? 1 : 0,
      pointerId: null,
      completing: completed,
      cancelling: !completed,
    } : null);

    const delay = prefs.reduceMotion ? 0 : completed ? 330 : 220;
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      if (completed) {
        setIndex((current) => current + (direction === "next" ? 1 : -1));
        if (!prefs.reduceMotion) playPageFlip();
      }
      setTurn(null);
      settleTimerRef.current = null;
    }, delay);
  };

  const startPointerTurn = (direction: TurnDirection, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!canTurn(direction) || turn) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setTurn({
      direction,
      progress: 0,
      pointerId: event.pointerId,
      startX: event.clientX,
      completing: false,
      cancelling: false,
    });
  };

  const movePointerTurn = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!turn || turn.pointerId !== event.pointerId || turn.completing || turn.cancelling) return;
    event.preventDefault();
    const width = bookRef.current?.getBoundingClientRect().width ?? 320;
    const distance = turn.direction === "next"
      ? turn.startX - event.clientX
      : event.clientX - turn.startX;
    setTurn((current) => current ? { ...current, progress: clamp(distance / (width * 0.58)) } : null);
  };

  const endPointerTurn = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!turn || turn.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    settleTurn(turn.direction, turn.progress >= 0.32);
  };

  const turnWithButton = (direction: TurnDirection) => {
    if (!canTurn(direction) || turn) return;
    setTurn({
      direction,
      progress: 0,
      pointerId: null,
      startX: 0,
      completing: true,
      cancelling: false,
    });
    window.requestAnimationFrame(() => settleTurn(direction, true));
  };

  const toNextPet = 100 - (points % 100);
  const progress = ((100 - toNextPet) / 100) * 100;
  const activeDirection = turn?.direction ?? (canTurn("next") ? "next" : "prev");
  const underneathIndex = index + (activeDirection === "next" ? 1 : -1);
  const hasUnderneath = underneathIndex >= 0 && underneathIndex < pageCount;

  const renderPage = (pageIndex: number, preview = false) => {
    const pet = ordered[pageIndex] ?? null;
    return (
      <div className={cn("relative h-full", preview && "pointer-events-none select-none")}>
        <div className="absolute left-0 top-0 bottom-0 w-8 rounded-l-[inherit] bg-accent/10 border-r border-dashed border-border/70" />
        <div className="absolute left-3 top-0 bottom-0 flex flex-col justify-evenly" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, ringIndex) => (
            <span key={ringIndex} className="h-2 w-2 rounded-full bg-accent/40 shadow-sm" />
          ))}
        </div>

        <div className="h-full overflow-y-auto pl-8 pr-5 py-6">
          {pet ? (
            <div className="space-y-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Page {pageIndex + 1} · {fmtDate(pet.createdAt)}
              </p>
              <div className="mx-auto w-52 h-52 max-w-[70vw] max-h-[70vw] rounded-3xl glass flex items-center justify-center p-3">
                <img
                  src={pet.imageDataUrl}
                  alt={pet.source === "photo" ? (pet.name ? `Photo of ${pet.name}` : "Photo of your pet") : (pet.name ?? "Pet drawing")}
                  className={cn(
                    "w-full h-full",
                    pet.source === "photo" ? "object-cover rounded-2xl" : "object-contain",
                  )}
                />
              </div>
              <h3 className="font-display text-2xl tracking-wider">{pet.name ?? "Unnamed friend"}</h3>
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent/80">
                {pet.source === "photo" ? "📸 Real pet photo" : "🎨 Drawn by you"}
              </p>
              <p className="text-xs italic text-muted-foreground">
                “{pet.source === "photo" ? "added with love on" : "hatched with love on"} {fmtDate(pet.createdAt)}”
              </p>

              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-accent/80 mb-2">Accessories</p>
                {(pet.accessories ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No accessories yet</p>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    {(pet.accessories ?? []).map((accessory: AccessoryId) => {
                      const custom = isCustomAccessory(accessory);
                      if (custom && !customArt[accessory]) return null;
                      return (
                        <span key={accessory} className="rounded-full px-3 py-1.5 text-xs glass flex items-center gap-1.5">
                          {custom ? (
                            <img src={customArt[accessory]} alt="" className="h-5 w-5 object-contain" />
                          ) : (
                            <span className="text-base">{icons.accessory(accessory as any)}</span>
                          )}
                          {custom ? "My drawing" : accessoryMeta(accessory as any).label}
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
              <h3 className="font-display text-xl tracking-wider">Your scrapbook is waiting for its first page!</h3>
              <p className="text-sm text-muted-foreground">Log your first mood to hatch your egg and create your first pet.</p>
              {onLogMood && !preview && (
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
                <Sparkles className="h-4 w-4 text-accent" /> Your next pet is waiting...
              </p>
              <p className="text-sm text-muted-foreground">Gain more points to unlock your next pet!</p>
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
        </div>
      </div>
    );
  };

  const sheetStyle = turn
    ? {
        "--turn-progress": turn.progress,
        "--turn-angle": `${turn.direction === "next" ? -168 * turn.progress : 168 * turn.progress}deg`,
        "--turn-shift": `${turn.direction === "next" ? -5 * turn.progress : 5 * turn.progress}%`,
      } as React.CSSProperties
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/85 backdrop-blur-md px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Pet Scrapbook</p>
          <h2 className="font-display text-xl tracking-widest">{ordered.length} page{ordered.length === 1 ? "" : "s"} of memories</h2>
        </div>
        <button
          onClick={onClose}
          aria-label={closeLabel ? `Close scrapbook and open ${closeLabel}` : "Close scrapbook"}
          className={cn(
            "rounded-full glass flex items-center justify-center gap-2",
            closeLabel ? "h-10 px-4 text-[10px] uppercase tracking-[0.2em]" : "h-10 w-10",
          )}
        >
          <X className="h-4 w-4" />
          {closeLabel}
        </button>
      </div>

      <div ref={bookRef} className="scrapbook-book relative flex-1 min-h-0 flex items-center isolate">
        {hasUnderneath && (
          <article
            aria-hidden="true"
            className={cn("scrapbook-sheet scrapbook-sheet-under absolute inset-0", activeDirection === "next" ? "is-next" : "is-prev")}
          >
            {renderPage(underneathIndex, true)}
          </article>
        )}

        <article
          className={cn(
            "scrapbook-sheet scrapbook-sheet-current relative w-full max-h-full",
            turn && `is-turning-${turn.direction}`,
            turn?.completing && "is-settling",
            turn?.cancelling && "is-cancelling",
          )}
          style={sheetStyle}
        >
          {renderPage(index)}
          {canTurn("next") && (
            <button
              type="button"
              className="scrapbook-corner scrapbook-corner-next"
              aria-label="Drag to turn to the next page"
              onPointerDown={(event) => startPointerTurn("next", event)}
              onPointerMove={movePointerTurn}
              onPointerUp={endPointerTurn}
              onPointerCancel={endPointerTurn}
            >
              <span className="sr-only">Drag to turn to the next page</span>
            </button>
          )}
          {canTurn("prev") && (
            <button
              type="button"
              className="scrapbook-corner scrapbook-corner-prev"
              aria-label="Drag to turn to the previous page"
              onPointerDown={(event) => startPointerTurn("prev", event)}
              onPointerMove={movePointerTurn}
              onPointerUp={endPointerTurn}
              onPointerCancel={endPointerTurn}
            >
              <span className="sr-only">Drag to turn to the previous page</span>
            </button>
          )}
        </article>
      </div>

      <div className="flex items-center justify-between gap-3 mt-4">
        <Button
          variant="outline"
          onClick={() => turnWithButton("prev")}
          disabled={!canTurn("prev") || Boolean(turn)}
          className="rounded-full glass h-11 px-5"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Older
        </Button>
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{index + 1} / {pageCount}</p>
        <Button
          variant="outline"
          onClick={() => turnWithButton("next")}
          disabled={!canTurn("next") || Boolean(turn)}
          className="rounded-full glass h-11 px-5"
        >
          Newer <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};