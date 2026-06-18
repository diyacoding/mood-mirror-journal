import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { moodMeta, type MoodKey } from "@/lib/moodTypes";
import {
  detectMoodFromVideo,
  initFaceLandmarker,
  type DetectionResult,
} from "@/lib/faceMood";
import { MoodPicker } from "@/components/MoodPicker";
import { addMoodEntry } from "@/lib/moodApi";
import { toast } from "sonner";

const INTENSITY_LABEL = ["Very Low", "Very Low", "Low", "Low", "Moderate", "Moderate", "High", "High", "Very High", "Very High"];

interface Props {
  onBack: () => void;
  onConfirm: (m: MoodKey) => void;
}

export const ScanScreen = ({ onBack, onConfirm }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [override, setOverride] = useState<MoodKey | undefined>();
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initFaceLandmarker();
        if (cancelled) return;
        setLoading(false);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e: any) {
        toast.error(e?.message || "Camera error");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const scan = async () => {
    if (!videoRef.current || !ready || scanning) return;
    setScanning(true);
    try {
      const r = await detectMoodFromVideo(videoRef.current);
      setResult(r);
      setOverride(r.faceDetected ? r.mood : undefined);
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const reset = () => { setResult(null); setOverride(undefined); };

  const confirm = async () => {
    const final = override ?? result?.mood;
    if (!final || !result) {
      toast.error("Pick a mood first");
      return;
    }
    setSaving(true);
    try {
      await addMoodEntry({
        mood: final,
        intensity: Math.max(1, Math.round((result.confidence ?? 0.5) * 10)),
        confidence: result.confidence,
        source: "scan",
      });
      toast.success("Mood saved ✨");
      onConfirm(final);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const detected = result?.faceDetected ? moodMeta(result.mood) : null;

  return (
    <div className="px-5 pt-10 pb-32 animate-fade-in relative">
      <div className="absolute -top-24 -left-20 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />
      <header className="flex items-center gap-3 mb-6 relative">
        <button onClick={onBack} className="rounded-full h-10 w-10 flex items-center justify-center glass hover:ring-glow transition-smooth">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-xl tracking-widest text-glow">Mood scan</h1>
      </header>

      <div className="aspect-square rounded-[2rem] overflow-hidden bg-muted shadow-glow relative ring-glow">
        <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" muted playsInline />
        {/* Scanning aura */}
        <div className="absolute inset-0 pointer-events-none rounded-[2rem]" style={{ boxShadow: "inset 0 0 80px hsl(270 96% 65% / 0.4)" }} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground glass-strong">
            Loading model…
          </div>
        )}
      </div>

      {!result ? (
        <Button onClick={scan} disabled={!ready || loading || scanning} className="w-full mt-6 rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-14 tracking-wider">
          {scanning ? "Analyzing…" : "Scan mood"}
        </Button>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-3xl glass-strong p-6 shadow-glow text-center">
            {detected ? (
              <>
                <div className="text-6xl drop-shadow-[0_0_24px_hsl(270_96%_75%/0.6)]">{detected.emoji}</div>
                <div className="font-display text-xl mt-3 tracking-widest text-glow">{detected.label}</div>
                <p className="text-xs text-accent/80 mt-2 uppercase tracking-[0.2em]">
                  Confidence · {Math.round((result.confidence ?? 0) * 100)}%
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No face detected. Try again with better lighting.</p>
            )}
          </div>

          {detected && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Adjust if needed</p>
              <MoodPicker value={override} onChange={setOverride} />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" className="flex-1 rounded-full glass border-accent/30 h-12">Retake</Button>
            <Button onClick={confirm} disabled={saving || !detected} className="flex-1 rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-12">
              {saving ? "Saving…" : "Save mood"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
