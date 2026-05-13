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
    <div className="px-5 pt-12 pb-32 space-y-4 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <p className="text-sm text-muted-foreground mt-1">Every check-in, gently kept.</p>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-3xl bg-card border border-border p-8 text-center shadow-card">
          <div className="text-4xl mb-2">🌱</div>
          <p className="text-sm text-muted-foreground">No entries yet. Start by logging a mood.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const m = moodMeta(e.mood);
            return (
              <div key={e.id} className="rounded-2xl bg-card border border-border p-4 shadow-card flex items-start gap-3">
                <span className="text-3xl">{m.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{e.intensity}/10</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{format(new Date(e.createdAt), "EEE, MMM d · p")}</div>
                  {e.note && <p className="text-sm mt-2 text-foreground/80">{e.note}</p>}
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                    via {e.source}
                  </div>
                </div>
                <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-destructive">
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
