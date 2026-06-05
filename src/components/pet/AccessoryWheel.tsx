import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import { ACCESSORIES, accessoryMeta } from "@/lib/petTypes";
import type { AccessoryKey } from "@/lib/petTypes";
import { cn } from "@/lib/utils";

interface Props {
  spinsRemaining: number;
  onSpin: () => Promise<AccessoryKey | null>;
  onClose: () => void;
}

export const AccessoryWheel = ({ spinsRemaining, onSpin, onClose }: Props) => {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<AccessoryKey | null>(null);
  const [rotation, setRotation] = useState(0);

  const handleSpin = async () => {
    if (spinning || spinsRemaining <= 0) return;
    setSpinning(true);
    setResult(null);
    const targetTurns = 4 + Math.random() * 2;
    setRotation((r) => r + targetTurns * 360);
    // Run real spin while animation plays
    const [reward] = await Promise.all([
      onSpin(),
      new Promise((res) => setTimeout(res, 1800)),
    ]);
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

        <div className="relative mx-auto w-56 h-56">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-2xl z-10">▼</div>
          <div
            className="relative w-full h-full rounded-full ring-glow shadow-glow overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: "transform 1.8s cubic-bezier(0.22, 1, 0.36, 1)",
              background:
                "conic-gradient(from 0deg, #7B2DFF, #C084FC, #E9D5FF, #7B2DFF, #C084FC, #E9D5FF, #7B2DFF, #C084FC, #E9D5FF, #7B2DFF)",
            }}
          >
            {ACCESSORIES.map((a, i) => {
              const angle = (360 / ACCESSORIES.length) * i;
              return (
                <span
                  key={a.key}
                  className="absolute left-1/2 top-1/2 text-2xl"
                  style={{
                    transform: `rotate(${angle}deg) translateY(-80px) rotate(-${angle}deg)`,
                  }}
                >
                  {a.emoji}
                </span>
              );
            })}
          </div>
        </div>

        {result && !spinning && (
          <div className="space-y-2 animate-fade-in">
            <div className="text-5xl">{accessoryMeta(result).emoji}</div>
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
          <Sparkles className="h-4 w-4 mr-2" />
          {spinsRemaining <= 0 ? "No spins" : spinning ? "Spinning…" : "Spin"}
        </Button>
      </div>
    </div>
  );
};
