import { useCallback, useRef, useState } from "react";
import { accessoryMeta, isCustomAccessory } from "@/lib/petTypes";
import type { AccessoryId, AccessoryPlacement, PetItem } from "@/lib/petTypes";
import { useIcons } from "@/lib/iconSets";
import { cn } from "@/lib/utils";

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

function defaultPos(id: AccessoryId): AccessoryPlacement {
  if (isCustomAccessory(id)) return { x: 50, y: 30 };
  return DEFAULT_POS[accessoryMeta(id as any).position] ?? { x: 50, y: 50 };
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
  const [dragId, setDragId] = useState<AccessoryId | null>(null);
  const [localPos, setLocalPos] = useState<Record<string, AccessoryPlacement>>({});

  // Scale grows gently with level
  const scale = 0.85 + Math.min(level, 10) * 0.04;

  const posFor = useCallback(
    (id: AccessoryId): AccessoryPlacement =>
      localPos[id] ?? pet?.accessoryPositions?.[id] ?? defaultPos(id),
    [localPos, pet?.accessoryPositions],
  );

  const pointToPercent = (clientX: number, clientY: number): AccessoryPlacement | null => {
    const el = boxRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
    };
  };

  const handleDown = (id: AccessoryId) => (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragId(id);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    const p = pointToPercent(e.clientX, e.clientY);
    if (p) setLocalPos((prev) => ({ ...prev, [dragId]: p }));
  };

  const handleUp = (e: React.PointerEvent) => {
    if (!dragId) return;
    const p = pointToPercent(e.clientX, e.clientY) ?? posFor(dragId);
    onMoveAccessory?.(dragId, p);
    setDragId(null);
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
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onPointerLeave={handleUp}
    >
      <div className="absolute inset-0 rounded-full gradient-glow blur-2xl opacity-70 animate-glow-pulse" />
      <img
        src={pet.imageDataUrl}
        alt={pet.name ?? "Pet"}
        className="relative w-full h-full object-contain rounded-3xl ring-glow animate-float"
        draggable={false}
      />
      {/* Accessory overlays — draggable when editable */}
      {(pet.accessories ?? []).map((a) => {
        const p = posFor(a);
        const custom = isCustomAccessory(a);
        const art = custom ? customArt[a] : null;
        if (custom && !art) return null;
        return (
          <span
            key={a}
            onPointerDown={handleDown(a)}
            className={cn(
              "absolute select-none drop-shadow-[0_0_12px_hsl(270_96%_75%/0.6)]",
              custom ? "block" : "text-3xl leading-none",
              editable ? "cursor-grab touch-none" : "pointer-events-none",
              dragId === a && "cursor-grabbing scale-110 z-20",
            )}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: "translate(-50%, -50%)",
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
          </span>
        );
      })}
    </div>
  );
};
