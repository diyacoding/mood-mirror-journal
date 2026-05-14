import { MOODS, type MoodKey } from "@/lib/moodTypes";
import { cn } from "@/lib/utils";

interface Props {
  value?: MoodKey;
  onChange: (m: MoodKey) => void;
  size?: "sm" | "md";
}

export const MoodPicker = ({ value, onChange, size = "md" }: Props) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {MOODS.map((m) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-2xl glass transition-smooth",
              size === "md" ? "py-4" : "py-3",
              active
                ? "ring-glow scale-[1.04] border-accent/60 bg-accent/10"
                : "hover:border-accent/40 hover:scale-[1.02]",
            )}
          >
            <span className={cn("drop-shadow-[0_0_12px_hsl(270_96%_75%/0.45)]", size === "md" ? "text-3xl" : "text-2xl")}>{m.emoji}</span>
            <span className="text-xs font-medium text-foreground/90 tracking-wide">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
