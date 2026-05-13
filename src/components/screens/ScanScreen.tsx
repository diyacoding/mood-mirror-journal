import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moodMeta, type MoodKey } from "@/lib/moodTypes";
import {
  detectMoodFromVideo,
  initFaceLandmarker,
  type DetectionResult,
} from "@/lib/faceMood";
import { MoodPicker } from "@/components/MoodPicker";
import { addMoodEntry } from "@/lib/moodApi";
import { toast } from "sonner";

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
    <div className="px-5 pt-12 pb-32 animate-fade-in">
      <header className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="rounded-full h-9 w-9 flex items-center justify-center bg-card border border-border">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-semibold">Mood scan</h1>
      </header>

      <div className="aspect-square rounded-3xl overflow-hidden bg-muted shadow-card relative">
        <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" muted playsInline />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground bg-card/60">
            Loading model…
          </div>
        )}
      </div>

      {!result ? (
        <Button onClick={scan} disabled={!ready || loading || scanning} className="w-full mt-5 rounded-full gradient-primary text-primary-foreground border-0 shadow-glow">
          {scanning ? "Analyzing…" : "Scan mood"}
        </Button>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-3xl bg-card border border-border p-5 shadow-card text-center">
            {detected ? (
              <>
                <div className="text-5xl">{detected.emoji}</div>
                <div className="font-medium mt-2">{detected.label}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Confidence: {Math.round((result.confidence ?? 0) * 100)}%
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No face detected. Try again with better lighting.</p>
            )}
          </div>

          {detected && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Adjust if needed:</p>
              <MoodPicker value={override} onChange={setOverride} />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} variant="outline" className="flex-1 rounded-full">Retake</Button>
            <Button onClick={confirm} disabled={saving || !detected} className="flex-1 rounded-full gradient-primary text-primary-foreground border-0">
              {saving ? "Saving…" : "Save mood"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
