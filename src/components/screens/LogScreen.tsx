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

export const LogScreen = ({ initialMood, onBack, onSaved }: Props) => {
  const [mood, setMood] = useState<MoodKey | undefined>(initialMood);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [sleep, setSleep] = useState<string>("");
  const [exercise, setExercise] = useState<string>("");
  const [screen, setScreen] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!mood) {
      toast.error("Pick a mood first");
      return;
    }
    setSaving(true);
    try {
      await addMoodEntry({
        mood,
        intensity,
        note: note.trim() || undefined,
        source: "manual",
        behaviors: {
          sleepHours: sleep ? Number(sleep) : undefined,
          exerciseMinutes: exercise ? Number(exercise) : undefined,
          screenTimeHours: screen ? Number(screen) : undefined,
        },
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
        <div className="flex justify-between">
          <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Intensity</Label>
          <span className="text-sm text-accent">{intensity}/10</span>
        </div>
        <Slider value={[intensity]} min={1} max={10} step={1} onValueChange={(v) => setIntensity(v[0])} />
      </section>

      <section className="space-y-3">
        <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Notes</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What's on your mind?" rows={3} className="glass border-accent/20 rounded-2xl" />
      </section>

      <section className="space-y-3">
        <Label className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Today's behaviors (optional)</Label>
        <div className="grid grid-cols-3 gap-2">
          <Input type="number" placeholder="Sleep (h)" value={sleep} onChange={(e) => setSleep(e.target.value)} className="glass border-accent/20 rounded-xl" />
          <Input type="number" placeholder="Exercise (m)" value={exercise} onChange={(e) => setExercise(e.target.value)} className="glass border-accent/20 rounded-xl" />
          <Input type="number" placeholder="Screen (h)" value={screen} onChange={(e) => setScreen(e.target.value)} className="glass border-accent/20 rounded-xl" />
        </div>
      </section>

      <Button onClick={save} disabled={saving} className="w-full rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-14 tracking-wider">
        {saving ? "Saving..." : "Save entry"}
      </Button>
    </div>
  );
};
