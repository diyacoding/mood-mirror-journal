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
    <div className="px-5 pt-10 pb-32 space-y-5 animate-fade-in relative">
      <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />
      <header className="relative">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Preferences</p>
        <h1 className="font-display text-2xl mt-2 tracking-widest text-glow">Settings</h1>
      </header>

      <section className="rounded-3xl glass shadow-card overflow-hidden">
        <div className="p-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent ring-1 ring-accent/30">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium tracking-wide">Daily reminder</div>
                <p className="text-xs text-muted-foreground mt-0.5 font-light">A gentle nudge to reflect.</p>
              </div>
              <Switch checked={reminders} onCheckedChange={toggleReminders} />
            </div>
            {reminders && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Remind me at</span>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32 rounded-xl glass border-accent/20" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl glass p-5 shadow-card flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent ring-1 ring-accent/30">
          <Cloud className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium tracking-wide">Cloud sync</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-light">
            Entries are synced securely in real time across your devices.
          </p>
          <p className="text-[10px] text-accent/70 mt-2 uppercase tracking-[0.2em]">{entries.length} entries in cloud</p>
        </div>
      </section>

      <section className="rounded-3xl glass p-5 shadow-card flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent ring-1 ring-accent/30">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium tracking-wide">Privacy</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-light">
            Camera frames for mood scans are processed locally and never uploaded.
          </p>
        </div>
      </section>

      <section className="rounded-3xl glass border-destructive/30 p-5 shadow-card flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive ring-1 ring-destructive/30">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium tracking-wide">Erase all data</div>
          <p className="text-xs text-muted-foreground mt-1 font-light">Delete every entry from the cloud. Cannot be undone.</p>
          {!confirming ? (
            <Button onClick={() => setConfirming(true)} variant="outline" className="mt-3 rounded-full text-destructive border-destructive/30 hover:bg-destructive/10">
              Erase data
            </Button>
          ) : (
            <div className="flex gap-2 mt-3">
              <Button onClick={() => setConfirming(false)} variant="outline" className="rounded-full flex-1 glass border-accent/20">Cancel</Button>
              <Button onClick={erase} disabled={erasing} className="rounded-full flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {erasing ? "Erasing..." : "Yes, erase"}
              </Button>
            </div>
          )}
        </div>
      </section>

      <footer className="text-center text-[11px] text-muted-foreground pt-2 flex items-center justify-center gap-1.5 tracking-wider uppercase">
        Made with <Heart className="h-3 w-3 text-accent fill-accent" /> · Mood Mirror
      </footer>
    </div>
  );
};
