import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MOODS } from "@/lib/moodStore";
import { toast } from "sonner";
import { fetchEntries, addEntry } from "@/lib/moodApi";

export const LogScreen = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await fetchEntries();
      setEntries(data);
    } catch (e) {
      toast.error("Failed to load entries");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-xl font-semibold">Log</h1>

      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground">No entries yet</p>
      ) : (
        entries.map((e) => {
          const mood = MOODS.find((m) => m.key === e.mood);

          return (
            <div
              key={e.id}
              className="p-3 rounded-xl border flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">
                  {mood?.emoji} {mood?.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
