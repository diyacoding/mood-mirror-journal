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
              "flex flex-col items-center justify-center gap-1.5 rounded-2xl border bg-card transition-smooth shadow-card",
              size === "md" ? "py-4" : "py-3",
              active
                ? "border-primary scale-[1.03] shadow-glow bg-primary/5"
                : "border-border hover:border-primary/40 hover:scale-[1.02]",
            )}
          >
            <span className={cn(size === "md" ? "text-3xl" : "text-2xl")}>{m.emoji}</span>
            <span className="text-xs font-medium text-foreground">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
};
