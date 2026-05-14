import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { moodMeta, type MoodEntry } from "@/lib/moodTypes";
import { deleteMoodEntry } from "@/lib/moodApi";
import { toast } from "sonner";

interface Props {
  entries: MoodEntry[];
  loading: boolean;
}

export const HistoryScreen = ({ entries, loading }: Props) => {
  const remove = async (id: string) => {
    try {
      await deleteMoodEntry(id);
      toast.success("Entry removed");
    } catch {
      toast.error("Could not delete");
    }
  };

  return (
    <div className="px-5 pt-10 pb-32 space-y-5 animate-fade-in relative">
      <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />
      <header className="relative">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Reflections</p>
        <h1 className="font-display text-2xl mt-2 tracking-widest text-glow">Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1 font-light">Every check-in, gently kept.</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl glass p-8 text-center shadow-card">
          <div className="text-4xl mb-2">🌙</div>
          <p className="text-sm text-muted-foreground">No entries yet. Begin your reflection.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const m = moodMeta(e.mood);
            return (
              <div key={e.id} className="rounded-2xl glass p-4 flex items-start gap-3 transition-smooth hover:ring-glow">
                <span className="text-3xl drop-shadow-[0_0_14px_hsl(270_96%_75%/0.5)]">{m.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium tracking-wide">{m.label}</div>
                    <div className="text-xs text-accent/80">{e.intensity}/10</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{format(new Date(e.createdAt), "EEE, MMM d · p")}</div>
                  {e.note && <p className="text-sm mt-2 text-foreground/80 font-light">{e.note}</p>}
                  <div className="text-[10px] uppercase tracking-[0.2em] text-accent/60 mt-2">
                    via {e.source}
                  </div>
                </div>
                <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-destructive transition-smooth">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
