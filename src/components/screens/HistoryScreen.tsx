import { useEffect, useState } from "react";
import { MOODS } from "@/lib/moodStore";
import { fetchEntries } from "@/lib/moodApi";
import { toast } from "sonner";

export const HistoryScreen = () => {
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
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-xl font-semibold">History</h1>

      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground">No history yet</p>
      ) : (
        entries.map((e) => {
          const mood = MOODS.find((m) => m.key === e.mood);

          return (
            <div
              key={e.id}
              className="p-4 border rounded-xl flex justify-between"
            >
              <div className="text-2xl">{mood?.emoji}</div>

              <div className="flex-1 ml-3">
                <div className="font-medium">{mood?.label}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
