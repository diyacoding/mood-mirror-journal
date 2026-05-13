import { useEffect, useState } from "react";
import { Bell, Trash2, Shield, Heart, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { deleteMoodEntry } from "@/lib/moodApi";
import type { MoodEntry } from "@/lib/moodTypes";
import { toast } from "sonner";

interface Props {
  entries: MoodEntry[];
}

export const SettingsScreen = ({ entries }: Props) => {
  const [reminders, setReminders] = useState<boolean>(() => localStorage.getItem("mm.reminders") === "1");
  const [time, setTime] = useState<string>(() => localStorage.getItem("mm.reminderTime") ?? "21:00");
  const [confirming, setConfirming] = useState(false);
  const [erasing, setErasing] = useState(false);

  useEffect(() => { localStorage.setItem("mm.reminders", reminders ? "1" : "0"); }, [reminders]);
  useEffect(() => { localStorage.setItem("mm.reminderTime", time); }, [time]);

  const toggleReminders = async (val: boolean) => {
    if (val && "Notification" in window && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Notifications blocked. Enable them in browser settings.");
        return;
      }
    }
    setReminders(val);
    toast.success(val ? "Reminders on" : "Reminders off");
  };

  const erase = async () => {
    setErasing(true);
    try {
      await Promise.all(entries.map((e) => deleteMoodEntry(e.id)));
      toast.success("All entries removed from cloud");
    } catch {
      toast.error("Some entries could not be removed");
    } finally {
      setErasing(false);
      setConfirming(false);
    }
  };

  return (
    <div className="px-5 pt-12 pb-32 space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      <section className="rounded-3xl bg-card border border-border shadow-card overflow-hidden">
        <div className="p-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Daily reminder</div>
                <p className="text-xs text-muted-foreground mt-0.5">A gentle nudge to check in.</p>
              </div>
              <Switch checked={reminders} onCheckedChange={toggleReminders} />
            </div>
            {reminders && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Remind me at</span>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32 rounded-xl" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-card border border-border p-5 shadow-card flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Cloud className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium">Cloud sync</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            All entries are stored in Firebase Firestore and sync across devices in real time.
          </p>
          <p className="text-xs text-muted-foreground mt-2">{entries.length} entries in cloud</p>
        </div>
      </section>

      <section className="rounded-3xl bg-card border border-border p-5 shadow-card flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium">Privacy</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Camera frames for mood scans are processed locally and never uploaded.
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-card border border-destructive/20 p-5 shadow-card flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium">Erase all data</div>
          <p className="text-xs text-muted-foreground mt-1">Delete every entry from the cloud. Cannot be undone.</p>
          {!confirming ? (
            <Button onClick={() => setConfirming(true)} variant="outline" className="mt-3 rounded-full text-destructive border-destructive/30 hover:bg-destructive/5">
              Erase data
            </Button>
          ) : (
            <div className="flex gap-2 mt-3">
              <Button onClick={() => setConfirming(false)} variant="outline" className="rounded-full flex-1">Cancel</Button>
              <Button onClick={erase} disabled={erasing} className="rounded-full flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {erasing ? "Erasing..." : "Yes, erase"}
              </Button>
            </div>
          )}
        </div>
      </section>

      <footer className="text-center text-xs text-muted-foreground pt-2 flex items-center justify-center gap-1">
        Made with <Heart className="h-3 w-3 text-primary fill-primary" /> · Mood Mirror
      </footer>
    </div>
  );
};
