import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ACCESSORIES, accessoryMeta } from "@/lib/petTypes";
import type { AccessoryKey } from "@/lib/petTypes";
import { useIcons } from "@/lib/iconSets";
import { cn } from "@/lib/utils";

interface Props {
  spinsRemaining: number;
  onSpin: () => Promise<AccessoryKey | null>;
  onClose: () => void;
}

const SEG = 360 / ACCESSORIES.length;
const SLICE_COLORS = ["#7B2DFF", "#C084FC", "#E9D5FF"];

// Discrete slices so each section aligns exactly with its accessory icon.
const CONIC = `conic-gradient(from 0deg, ${ACCESSORIES.map((_, i) => {
  const c = SLICE_COLORS[i % SLICE_COLORS.length];
  return `${c} ${i * SEG}deg ${(i + 1) * SEG}deg`;
}).join(", ")})`;

export const AccessoryWheel = ({ spinsRemaining, onSpin, onClose }: Props) => {
  const icons = useIcons();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<AccessoryKey | null>(null);
  const [rotation, setRotation] = useState(0);

  const handleSpin = async () => {
    if (spinning || spinsRemaining <= 0) return;
    setSpinning(true);
    setResult(null);

    const reward = await onSpin();

    // Land the won slice exactly under the top indicator.
    const idx = Math.max(0, ACCESSORIES.findIndex((a) => a.key === reward));
    const center = idx * SEG + SEG / 2;
    setRotation((r) => {
      const turns = 4 * 360;
      const target = -center; // slice center rotates to 0deg (top)
      const base = r + turns;
      const delta = ((target - base) % 360 + 360) % 360;
      return base + delta;
    });

    await new Promise((res) => setTimeout(res, 1850));
    setResult(reward);
    setSpinning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-glow text-center">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm tracking-[0.25em] uppercase">Reward Wheel</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full glass flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">
          {spinsRemaining} spin{spinsRemaining === 1 ? "" : "s"} available
        </p>

        <div className="relative mx-auto w-56 h-56 max-w-full">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-2xl z-10">▼</div>
          <div
            className="relative w-full h-full rounded-full ring-glow shadow-glow overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: "transform 1.8s cubic-bezier(0.22, 1, 0.36, 1)",
              background: CONIC,
            }}
          >
            {ACCESSORIES.map((a, i) => {
              // Center of slice i, measured clockwise from the top (matches conic-gradient).
              const angle = i * SEG + SEG / 2;
              return (
                <span
                  key={a.key}
                  className="absolute left-1/2 top-1/2 text-2xl leading-none"
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-80px) rotate(${-angle}deg)`,
                  }}
                >
                  {icons.accessory(a.key)}
                </span>
              );
            })}
          </div>
        </div>

        {result && !spinning && (
          <div className="space-y-2 animate-fade-in">
            <div className="text-5xl">{icons.accessory(result)}</div>
            <p className="font-display text-lg text-glow tracking-wider">
              {accessoryMeta(result).label}!
            </p>
            <p className="text-xs text-muted-foreground">Added to your inventory</p>
          </div>
        )}

        <Button
          onClick={handleSpin}
          disabled={spinning || spinsRemaining <= 0}
          className={cn(
            "w-full rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-12",
          )}
        >
          {spinsRemaining <= 0 ? "No spins" : spinning ? "Spinning…" : "Spin"}
        </Button>
      </div>
    </div>
  );
};
