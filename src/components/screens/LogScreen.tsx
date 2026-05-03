import { useEffect, useState } from "react";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { MoodPicker } from "@/components/MoodPicker";
import { MoodKey } from "@/lib/moodStore";
import { toast } from "sonner";

interface Props {
  initialMood?: MoodKey;
  onBack: () => void;
  onSaved: () => void;
}

export const LogScreen = ({ initialMood, onBack, onSaved }: Props) => {
  const existing = getEntry(todayKey());
  const [mood, setMood] = useState<MoodKey | undefined>(initialMood ?? existing?.mood);
  const [intensity, setIntensity] = useState<number>(existing?.intensity ?? 6);
  const [note, setNote] = useState<string>(existing?.note ?? "");
  const [sleepHours, setSleepHours] = useState<string>(existing?.behaviors.sleepHours?.toString() ?? "");
  const [exerciseMinutes, setExerciseMinutes] = useState<string>(existing?.behaviors.exerciseMinutes?.toString() ?? "");
  const [screenTimeHours, setScreenTimeHours] = useState<string>(existing?.behaviors.screenTimeHours?.toString() ?? "");
  const [productivityHours, setProductivityHours] = useState<string>(existing?.behaviors.productivityHours?.toString() ?? "");
  const [socialLevel, setSocialLevel] = useState<number>(existing?.behaviors.socialLevel ?? 3);
  const [custom, setCustom] = useState<{ name: string; value: string }[]>(existing?.behaviors.custom ?? []);

  useEffect(() => { if (initialMood) setMood(initialMood); }, [initialMood]);

  const num = (s: string) => (s.trim() === "" ? undefined : Math.max(0, Number(s) || 0));

  const save = () => {
    if (!mood) { toast.error("Pick a mood to continue"); return; }
    try {
      const entry: MoodEntry = {
        date: todayKey(),
        mood,
        intensity,
        note: note.trim() || undefined,
        behaviors: {
          sleepHours: num(sleepHours),
          exerciseMinutes: num(exerciseMinutes),
          screenTimeHours: num(screenTimeHours),
          productivityHours: num(productivityHours),
          socialLevel,
          custom: custom.filter(c => c.name.trim() && c.value.trim()),
        },
        createdAt: existing?.createdAt ?? Date.now(),
      };
     await addDoc(collection(db, "mood_entries"), entry);
      console.info("[MoodMirror] Entry saved", entry);
      toast.success("Mood saved successfully 🌿");
      onSaved();
    } catch (e: any) {
      console.error("[MoodMirror] Save failed", e);
      toast.error(`Could not save: ${e?.message ?? e}`);
    }
  };

  return (
    <div className="min-h-screen pb-32 animate-fade-in">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">Today's check-in</h1>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-7">
        <section>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Mood</h2>
          <MoodPicker value={mood} onChange={setMood} />
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Intensity</h2>
            <span className="text-2xl font-semibold text-primary">{intensity}</span>
          </div>
          <Slider min={1} max={10} step={1} value={[intensity]} onValueChange={(v) => setIntensity(v[0])} />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
            <span>Subtle</span><span>Intense</span>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Note (optional)</h2>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything on your mind?"
            className="rounded-2xl resize-none min-h-[90px] bg-card"
          />
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Behaviors</h2>
          <div className="grid grid-cols-2 gap-3">
            <BehaviorField label="Sleep (hrs)" value={sleepHours} onChange={setSleepHours} placeholder="7.5" />
            <BehaviorField label="Exercise (min)" value={exerciseMinutes} onChange={setExerciseMinutes} placeholder="30" />
            <BehaviorField label="Screen time (hrs)" value={screenTimeHours} onChange={setScreenTimeHours} placeholder="5" />
            <BehaviorField label="Focus / study (hrs)" value={productivityHours} onChange={setProductivityHours} placeholder="2" />
          </div>

          <div className="mt-4 rounded-2xl bg-card border border-border p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium">Social interaction</span>
              <span className="text-xs text-muted-foreground">{["Solo","Quiet","Some","Active","Very social"][socialLevel-1]}</span>
            </div>
            <Slider min={1} max={5} step={1} value={[socialLevel]} onValueChange={(v) => setSocialLevel(v[0])} />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custom</h2>
            <button
              onClick={() => setCustom([...custom, { name: "", value: "" }])}
              className="text-xs text-primary font-medium flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {custom.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => setCustom(custom.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  placeholder="e.g. Meditation"
                  className="rounded-xl bg-card"
                />
                <Input
                  value={c.value}
                  onChange={(e) => setCustom(custom.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                  placeholder="10 min"
                  className="rounded-xl bg-card"
                />
                <button
                  onClick={() => setCustom(custom.filter((_, j) => j !== i))}
                  className="p-2 rounded-xl hover:bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-5 pb-6 pt-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button onClick={save} size="lg" className="w-full rounded-full gradient-sky text-primary-foreground border-0 shadow-glow hover:opacity-95">
          <Check className="h-4 w-4 mr-1" /> Save entry
        </Button>
      </div>
    </div>
  );
};

const BehaviorField = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
  <label className="rounded-2xl bg-card border border-border p-3 block">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <Input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border-0 px-0 h-8 text-base focus-visible:ring-0 bg-transparent"
    />
  </label>
);
