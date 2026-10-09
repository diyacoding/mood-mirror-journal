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
type Side = "left" | "right";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

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
  const n = ordered.length;

  // Spread s shows page s (left) and page s+1 (right). Page n is the locked page.
  const spreadCount = Math.max(1, n);
  const [spread, setSpread] = useState(Math.max(0, n - 2));
  const [turn, setTurn] = useState<TurnState | null>(null);

  useEffect(() => {
    setSpread((current) => Math.min(current, spreadCount - 1));
  }, [spreadCount]);

  useEffect(() => () => {
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
  }, []);

  const canTurn = (direction: TurnDirection) =>
    direction === "next" ? spread < spreadCount - 1 : spread > 0;

  const settleTurn = (direction: TurnDirection, completed: boolean) => {
    setTurn((current) => current ? {
      ...current,
      progress: completed ? 1 : 0,
      pointerId: null,
      completing: completed,
      cancelling: !completed,
    } : null);

    const delay = prefs.reduceMotion ? 0 : completed ? 350 : 230;
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      if (completed) {
        setSpread((current) => current + (direction === "next" ? 1 : -1));
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
    setTurn({ direction, progress: 0.04, pointerId: event.pointerId, startX: event.clientX, completing: false, cancelling: false });
  };

  const movePointerTurn = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!turn || turn.pointerId !== event.pointerId || turn.completing || turn.cancelling) return;
    event.preventDefault();
    const width = bookRef.current?.getBoundingClientRect().width ?? 320;
    const distance = turn.direction === "next" ? turn.startX - event.clientX : event.clientX - turn.startX;
    setTurn((current) => current ? { ...current, progress: Math.max(0.04, clamp(distance / (width * 0.7))) } : null);
  };

  const endPointerTurn = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!turn || turn.pointerId !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    settleTurn(turn.direction, turn.progress >= 0.3);
  };

  const turnWithButton = (direction: TurnDirection) => {
    if (!canTurn(direction) || turn) return;
    setTurn({ direction, progress: 0, pointerId: null, startX: 0, completing: false, cancelling: false });
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => settleTurn(direction, true)));
  };

  const toNextPet = 100 - (points % 100);
  const progressPct = points % 100;

  const renderPage = (pageIndex: number, side: Side) => {
    const pet = n > 0 ? ordered[pageIndex] ?? null : null;
    return (
      <div className={cn("book-page paper-surface", side === "left" ? "book-page-left" : "book-page-right")}>
        <div className="h-full overflow-y-auto px-3 sm:px-5 py-5">
          {pet ? (
            <div className="relative space-y-3 text-center">
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                Page {pageIndex + 1}
              </p>
              <div className="relative mx-auto w-full max-w-[11rem] aspect-square bg-background/0 p-2 rounded-sm border border-[hsl(var(--paper-edge))] shadow-sm rotate-[-1.5deg]" style={{ background: "hsl(0 0% 100% / 0.55)" }}>
                <span className="book-tape -top-2 left-1/2 -translate-x-1/2 rotate-[-4deg]" />
                <img
                  src={pet.imageDataUrl}
                  alt={pet.source === "photo" ? (pet.name ? `Photo of ${pet.name}` : "Photo of your pet") : (pet.name ?? "Pet drawing")}
                  className={cn("w-full h-full", pet.source === "photo" ? "object-cover" : "object-contain")}
                  draggable={false}
                />
              </div>
              <h3 className="font-display text-lg sm:text-xl tracking-wider break-words">{pet.name ?? "Unnamed friend"}</h3>
              {(pet.accessories ?? []).length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {(pet.accessories ?? []).map((accessory: AccessoryId) => {
                    const custom = isCustomAccessory(accessory);
                    if (custom && !customArt[accessory]) return null;
                    return (
                      <span key={accessory} title={custom ? "My drawing" : accessoryMeta(accessory as any).label} className="h-7 w-7 flex items-center justify-center rounded-full border border-dashed border-[hsl(var(--paper-edge))]">
                        {custom ? (
                          <img src={customArt[accessory]} alt="" className="h-5 w-5 object-contain" />
                        ) : (
                          <span className="text-sm">{icons.accessory(accessory as any)}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ) : n === 0 ? (
            side === "left" ? (
              <div className="space-y-3 text-center py-8">
                <div className="text-4xl">🐣</div>
                <h3 className="font-display text-lg tracking-wider">Your scrapbook is waiting for its first page</h3>
                <p className="text-xs text-muted-foreground">Your first pet will appear here once you unlock it.</p>
              </div>
            ) : (
              <div className="space-y-3 text-center py-8">
                <p className="text-xs text-muted-foreground">Log moods to earn points — at 100 points your egg hatches.</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{progressPct} / 100 points</p>
                {onLogMood && (
                  <Button
                    onClick={() => { onClose(); onLogMood(); }}
                    className="rounded-full gradient-primary text-primary-foreground border-0 h-10 px-5"
                  >
                    Log a mood
                  </Button>
                )}
              </div>
            )
          ) : (
            <div className="space-y-4 text-center py-8">
              <div className="mx-auto h-12 w-12 rounded-full border-2 border-dashed border-[hsl(var(--paper-edge))] flex items-center justify-center">
                <Lock className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-display text-base sm:text-lg tracking-[0.2em] uppercase">To be unlocked</h3>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-accent" /> Your next pet is waiting!
              </p>
              <p className="text-xs text-muted-foreground">Gain more points to unlock your next pet.</p>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{progressPct} / 100 points</p>
                <div className="h-1.5 rounded-full bg-[hsl(var(--paper-ink)/0.12)] overflow-hidden">
                  <div className="h-full gradient-primary" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{toNextPet} more to go</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const target = turn ? spread + (turn.direction === "next" ? 1 : -1) : null;
  const angle = turn ? (turn.direction === "next" ? -180 : 180) * turn.progress : 0;
  const leafStyle = {
    "--turn-angle": `${angle}deg`,
    "--turn-progress": turn?.progress ?? 0,
  } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/85 backdrop-blur-md px-3 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Pet Scrapbook</p>
          <h2 className="font-display text-xl tracking-widest">{n} page{n === 1 ? "" : "s"} of memories</h2>
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

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          ref={bookRef}
          className="book w-full max-w-3xl"
          style={{ height: "min(100%, 34rem)", minHeight: "22rem" }}
        >
          <div className="book-inner">
            {/* Target spread, revealed underneath the turning leaf */}
            {turn && target != null && (
              <div className="book-spread" aria-hidden="true" style={{ zIndex: 1 }}>
                {renderPage(target, "left")}
                {renderPage(target + 1, "right")}
              </div>
            )}

            {/* Current spread (the turning side is lifted into the leaf) */}
            <div className="book-spread" style={{ zIndex: 2 }}>
              {turn?.direction === "prev" ? <div /> : renderPage(spread, "left")}
              {turn?.direction === "next" ? <div /> : renderPage(spread + 1, "right")}
            </div>

            {turn && target != null && (
              <div
                className={cn(
                  "book-leaf",
                  turn.direction === "next" ? "is-next" : "is-prev",
                  turn.completing && "is-settling",
                  turn.cancelling && "is-cancelling",
                )}
                style={leafStyle}
                aria-hidden="true"
              >
                <div className="book-leaf-face">
                  {turn.direction === "next" ? renderPage(spread + 1, "right") : renderPage(spread, "left")}
                </div>
                <div className="book-leaf-face book-leaf-back">
                  {turn.direction === "next" ? renderPage(target, "left") : renderPage(target + 1, "right")}
                </div>
              </div>
            )}

            <div className="book-gutter" />

            {canTurn("next") && (
              <button
                type="button"
                className="book-corner book-corner-next"
                aria-label="Drag to turn to the next page"
                onPointerDown={(event) => startPointerTurn("next", event)}
                onPointerMove={movePointerTurn}
                onPointerUp={endPointerTurn}
                onPointerCancel={endPointerTurn}
              />
            )}
            {canTurn("prev") && (
              <button
                type="button"
                className="book-corner book-corner-prev"
                aria-label="Drag to turn to the previous page"
                onPointerDown={(event) => startPointerTurn("prev", event)}
                onPointerMove={movePointerTurn}
                onPointerUp={endPointerTurn}
                onPointerCancel={endPointerTurn}
              />
            )}
          </div>
        </div>
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
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{spread + 1} / {spreadCount}</p>
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
