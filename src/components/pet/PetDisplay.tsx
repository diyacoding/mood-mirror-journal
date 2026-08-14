import { useCallback, useEffect, useRef, useState } from "react";
import { accessoryMeta, isCustomAccessory } from "@/lib/petTypes";
import type { AccessoryId, AccessoryPlacement, PetItem } from "@/lib/petTypes";
import { useIcons } from "@/lib/iconSets";
import { cn } from "@/lib/utils";
import { Maximize2, RotateCw } from "lucide-react";

interface Props {
  pet: PetItem | null;
  level: number;
  size?: "sm" | "md" | "lg";
  /** Custom accessory art, keyed by accessory id. */
  customArt?: Record<string, string>;
  /** Enable drag-to-position of accessories. */
  editable?: boolean;
  onMoveAccessory?: (id: AccessoryId, pos: AccessoryPlacement) => void;
}

const SIZE_CLASS = {
  sm: "w-24 h-24",
  md: "w-44 h-44",
  lg: "w-64 h-64",
};

const DEFAULT_POS: Record<string, AccessoryPlacement> = {
  top: { x: 50, y: 8 },
  face: { x: 50, y: 36 },
  body: { x: 50, y: 78 },
  side: { x: 88, y: 50 },
};

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

function defaultPos(id: AccessoryId): AccessoryPlacement {
  if (isCustomAccessory(id)) return { x: 50, y: 30, scale: 1, rotation: 0 };
  return { scale: 1, rotation: 0, ...(DEFAULT_POS[accessoryMeta(id as any).position] ?? { x: 50, y: 50 }) };
}

type Mode = "move" | "resize" | "rotate" | "pinch";

interface Gesture {
  id: AccessoryId;
  mode: Mode;
  start: AccessoryPlacement;
  /** pointer distance/angle at gesture start (resize/rotate/pinch) */
  startDist?: number;
  startAngle?: number;
  pointers?: Map<number, { x: number; y: number }>;
}

export const PetDisplay = ({
  pet,
  level,
  size = "lg",
  customArt = {},
  editable = false,
  onMoveAccessory,
}: Props) => {
  const icons = useIcons();
  const boxRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<AccessoryId | null>(null);
  const [localPos, setLocalPos] = useState<Record<string, AccessoryPlacement>>({});
  const gestureRef = useRef<Gesture | null>(null);
  const [active, setActive] = useState<Mode | null>(null);

  // Scale grows gently with level
  const scale = 0.85 + Math.min(level, 10) * 0.04;

  const posFor = useCallback(
    (id: AccessoryId): AccessoryPlacement => {
      const base = defaultPos(id);
      const saved = localPos[id] ?? pet?.accessoryPositions?.[id];
      return { ...base, ...(saved ?? {}) };
    },
    [localPos, pet?.accessoryPositions],
  );

  // Deselect when the accessory is no longer worn
  useEffect(() => {
    if (selected && !(pet?.accessories ?? []).includes(selected)) setSelected(null);
  }, [pet?.accessories, selected]);

  const rect = () => boxRef.current?.getBoundingClientRect() ?? null;

  const toPercent = (clientX: number, clientY: number): AccessoryPlacement | null => {
    const r = rect();
    if (!r) return null;
    return {
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
    };
  };

  /** Center of an accessory in client px. */
  const centerOf = (p: AccessoryPlacement) => {
    const r = rect();
    if (!r) return null;
    return { x: r.left + (p.x / 100) * r.width, y: r.top + (p.y / 100) * r.height };
  };

  const commit = (id: AccessoryId, p: AccessoryPlacement) => {
    setLocalPos((prev) => ({ ...prev, [id]: p }));
  };

  const startGesture =
    (id: AccessoryId, mode: Mode) => (e: React.PointerEvent) => {
      if (!editable) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      setSelected(id);
      const start = posFor(id);
      const c = centerOf(start);
      const dx = c ? e.clientX - c.x : 0;
      const dy = c ? e.clientY - c.y : 0;
      gestureRef.current = {
        id,
        mode,
        start,
        startDist: Math.hypot(dx, dy) || 1,
        startAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
        pointers: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]),
      };
      setActive(mode);
    };

  const handleMove = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g) return;
    g.pointers?.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...(g.pointers?.values() ?? [])];

    // Two-finger pinch/rotate takes over
    if (pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      if (g.mode !== "pinch") {
        g.mode = "pinch";
        g.startDist = dist;
        g.startAngle = ang;
        g.start = posFor(g.id);
        setActive("pinch");
      }
      commit(g.id, {
        ...g.start,
        scale: Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, (g.start.scale ?? 1) * (dist / (g.startDist || 1))),
        ),
        rotation: (g.start.rotation ?? 0) + (ang - (g.startAngle ?? 0)),
      });
      return;
    }

    if (g.mode === "move") {
      const p = toPercent(e.clientX, e.clientY);
      if (p) commit(g.id, { ...g.start, x: p.x, y: p.y });
      return;
    }

    const c = centerOf(g.start);
    if (!c) return;
    const dx = e.clientX - c.x;
    const dy = e.clientY - c.y;

    if (g.mode === "resize") {
      const dist = Math.hypot(dx, dy) || 1;
      commit(g.id, {
        ...g.start,
        scale: Math.max(
          MIN_SCALE,
          Math.min(MAX_SCALE, (g.start.scale ?? 1) * (dist / (g.startDist || 1))),
        ),
      });
    } else if (g.mode === "rotate") {
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
      commit(g.id, {
        ...g.start,
        rotation: (g.start.rotation ?? 0) + (ang - (g.startAngle ?? 0)),
      });
    }
  };

  const endGesture = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    if (!g) return;
    g.pointers?.delete(e.pointerId);
    if ((g.pointers?.size ?? 0) > 0) return;
    gestureRef.current = null;
    setActive(null);
    onMoveAccessory?.(g.id, posFor(g.id));
  };

  if (!pet) {
    return (
      <div
        className={cn(
          "rounded-full glass-strong flex items-center justify-center shadow-glow ring-glow text-4xl",
          SIZE_CLASS[size],
        )}
      >
        {icons.misc("egg")}
      </div>
    );
  }

  return (
    <div
      ref={boxRef}
      className={cn("relative touch-none", SIZE_CLASS[size])}
      style={{ transform: `scale(${scale})` }}
      onPointerMove={handleMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      <div className="absolute inset-0 rounded-full gradient-glow blur-2xl opacity-70 animate-glow-pulse" />
      <img
        src={pet.imageDataUrl}
        alt={pet.name ?? "Pet"}
        className="relative w-full h-full object-contain rounded-3xl ring-glow animate-float"
        draggable={false}
      />
      {/* Accessory overlays — draggable, resizable and rotatable when editable */}
      {(pet.accessories ?? []).map((a) => {
        const p = posFor(a);
        const custom = isCustomAccessory(a);
        const art = custom ? customArt[a] : null;
        if (custom && !art) return null;
        const isSel = editable && selected === a;
        return (
          <span
            key={a}
            onPointerDown={startGesture(a, "move")}
            className={cn(
              "absolute select-none drop-shadow-[0_0_12px_hsl(270_96%_75%/0.6)]",
              custom ? "block" : "text-3xl leading-none",
              editable ? "cursor-grab touch-none" : "pointer-events-none",
              isSel && "z-20",
              active && isSel && "cursor-grabbing",
            )}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `translate(-50%, -50%) rotate(${p.rotation ?? 0}deg) scale(${p.scale ?? 1})`,
              transformOrigin: "center",
            }}
          >
            {custom ? (
              <img
                src={art!}
                alt="Custom accessory"
                className="w-16 h-16 object-contain"
                draggable={false}
              />
            ) : (
              icons.accessory(a as any)
            )}

            {isSel && (
              <>
                {/* selection frame */}
                <span className="pointer-events-none absolute -inset-2 rounded-xl border border-dashed border-accent/70" />
                {/* rotate handle (top-right) */}
                <span
                  onPointerDown={startGesture(a, "rotate")}
                  aria-label="Rotate accessory"
                  className="absolute -top-4 -right-4 h-6 w-6 rounded-full glass-strong border border-accent/60 flex items-center justify-center cursor-grab touch-none shadow-glow"
                >
                  <RotateCw className="h-3 w-3 text-accent" />
                </span>
                {/* resize handle (bottom-right) */}
                <span
                  onPointerDown={startGesture(a, "resize")}
                  aria-label="Resize accessory"
                  className="absolute -bottom-4 -right-4 h-6 w-6 rounded-full glass-strong border border-accent/60 flex items-center justify-center cursor-nwse-resize touch-none shadow-glow"
                >
                  <Maximize2 className="h-3 w-3 text-accent" />
                </span>
              </>
            )}
          </span>
        );
      })}
    </div>
  );
};
