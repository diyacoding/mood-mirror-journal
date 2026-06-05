import { accessoryMeta } from "@/lib/petTypes";
import type { PetItem } from "@/lib/petTypes";
import { cn } from "@/lib/utils";

interface Props {
  pet: PetItem | null;
  level: number;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "w-24 h-24",
  md: "w-44 h-44",
  lg: "w-64 h-64",
};

export const PetDisplay = ({ pet, level, size = "lg" }: Props) => {
  // Scale grows gently with level
  const scale = 0.85 + Math.min(level, 10) * 0.04;

  if (!pet) {
    return (
      <div
        className={cn(
          "rounded-full glass-strong flex items-center justify-center shadow-glow ring-glow text-4xl",
          SIZE_CLASS[size],
        )}
      >
        🥚
      </div>
    );
  }

  return (
    <div className={cn("relative", SIZE_CLASS[size])} style={{ transform: `scale(${scale})` }}>
      <div className="absolute inset-0 rounded-full gradient-glow blur-2xl opacity-70 animate-glow-pulse" />
      <img
        src={pet.imageDataUrl}
        alt={pet.name ?? "Pet"}
        className="relative w-full h-full object-contain rounded-3xl ring-glow animate-float"
      />
      {/* Accessory overlays */}
      {pet.accessories.map((a) => {
        const meta = accessoryMeta(a);
        const positionStyle =
          meta.position === "top"
            ? "top-0 left-1/2 -translate-x-1/2 -translate-y-1/3"
            : meta.position === "face"
            ? "top-1/3 left-1/2 -translate-x-1/2"
            : meta.position === "body"
            ? "bottom-2 left-1/2 -translate-x-1/2"
            : "top-1/2 -right-4 -translate-y-1/2";
        return (
          <span
            key={a}
            className={cn(
              "absolute text-3xl drop-shadow-[0_0_12px_hsl(270_96%_75%/0.6)]",
              positionStyle,
            )}
          >
            {meta.emoji}
          </span>
        );
      })}
    </div>
  );
};
