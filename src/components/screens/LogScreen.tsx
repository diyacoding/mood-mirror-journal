import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoodPicker } from "@/components/MoodPicker";
import type { MoodKey } from "@/lib/moodTypes";
import { addMoodEntry } from "@/lib/moodApi";
import { toast } from "sonner";

interface Props {
  initialMood?: MoodKey;
  onBack: () => void;
  onSaved: () => void;
}

const INTENSITY_LABEL = ["Very Low", "Very Low", "Low", "Low", "Moderate", "Moderate", "High", "High", "Very High", "Very High"];

export const LogScreen = ({ initialMood, onBack, onSaved }: Props) => {
  const [mood, setMood] = useState<MoodKey | undefined>(initialMood);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [sleepH, setSleepH] = useState<string>("");
  const [sleepM, setSleepM] = useState<string>("");
  const [exH, setExH] = useState<string>("");
  const [exM, setExM] = useState<string>("");
  const [screenH, setScreenH] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!mood) {
      toast.error("Pick a mood first");
      return;
    }
    setSaving(true);
    try {
      const sleepHours = sleepH || sleepM
        ? (Number(sleepH || 0) + Number(sleepM || 0) / 60)
        : undefined;
      const exerciseMinutes = exH || exM
        ? (Number(exH || 0) * 60 + Number(exM || 0))
        : undefined;
      const screenTimeHours = screenH ? Number(screenH) : undefined;
      await addMoodEntry({
        mood,
        intensity,
        note: note.trim() || undefined,
        source: "manual",
        behaviors: { sleepHours, exerciseMinutes, screenTimeHours },
      });
      toast.success("Mood saved ✨");
      onSaved();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 pt-10 pb-32 space-y-6 animate-fade-in relative">
      <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />
      <header className="flex items-center gap-3 relative">
        <button onClick={onBack} className="rounded-full h-10 w-10 flex items-center justify-center glass hover:ring-glow transition-smooth">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-xl tracking-widest text-glow">Log mood</h1>
      </header>

      <section className="space-y-3 relative">
        <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">How are you feeling?</Label>
        <MoodPicker value={mood} onChange={setMood} />
      </section>

      <section className="space-y-3 glass rounded-3xl p-5">
        <div className="flex justify-between items-baseline">
          <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Intensity</Label>
          <span className="text-sm text-accent">{INTENSITY_LABEL[intensity - 1]} · {intensity}/10</span>
        </div>
        <Slider value={[intensity]} min={1} max={10} step={1} onValueChange={(v) => setIntensity(v[0])} />
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Very Low → Very High</p>
      </section>

      <section className="space-y-3">
        <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Notes (optional)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's on your mind? e.g. 'Had a stressful exam today.'" rows={3} className="glass border-accent/20 rounded-2xl" />
      </section>

      <section className="space-y-4">
        <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Today's behaviors (optional)</Label>

        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-sm font-medium">Sleep Duration</p>
          <p className="text-[11px] text-muted-foreground">How long did you sleep last night?</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Hours</Label>
              <Input type="number" min={0} max={24} placeholder="e.g. 7" value={sleepH} onChange={(e) => setSleepH(e.target.value)} className="glass border-accent/20 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Minutes</Label>
              <Input type="number" min={0} max={59} placeholder="e.g. 30" value={sleepM} onChange={(e) => setSleepM(e.target.value)} className="glass border-accent/20 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-sm font-medium">Exercise Duration</p>
          <p className="text-[11px] text-muted-foreground">Total movement / workout time today.</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Hours</Label>
              <Input type="number" min={0} max={24} placeholder="e.g. 1" value={exH} onChange={(e) => setExH(e.target.value)} className="glass border-accent/20 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Minutes</Label>
              <Input type="number" min={0} max={59} placeholder="e.g. 15" value={exM} onChange={(e) => setExM(e.target.value)} className="glass border-accent/20 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-sm font-medium">Screen Time</p>
          <p className="text-[11px] text-muted-foreground">Approximate phone + computer time today.</p>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Hours</Label>
            <Input type="number" min={0} max={24} placeholder="e.g. 4" value={screenH} onChange={(e) => setScreenH(e.target.value)} className="glass border-accent/20 rounded-xl" />
          </div>
        </div>
      </section>

      <Button onClick={save} disabled={saving} className="w-full rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-14 tracking-wider">
        {saving ? "Saving..." : "Save entry"}
      </Button>
    </div>
  );
};
