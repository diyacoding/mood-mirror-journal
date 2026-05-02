import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOODS, MoodKey } from "@/lib/moodStore";
import { detectMoodFromVideo } from "@/lib/faceMood";
import { MoodPicker } from "@/components/MoodPicker";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onConfirm: (m: MoodKey) => void;
}

export const ScanScreen = ({ onBack, onConfirm }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ mood: MoodKey; confidence: number } | null>(null);
  const [override, setOverride] = useState<MoodKey | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 480, height: 480 },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e: any) {
        setError(e?.message || "Camera unavailable. You can still log your mood manually.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const scan = () => {
    if (!videoRef.current || !ready) return;
    setScanning(true);
    setTimeout(() => {
      const r = detectMoodFromVideo(videoRef.current!);
      setResult(r);
      setOverride(r.mood);
      setScanning(false);
    }, 1200);
  };

  const reset = () => { setResult(null); setOverride(undefined); };

  const confirm = () => {
    const final = override ?? result?.mood;
    if (!final) return;
    toast.success("Mood captured ✨");
    onConfirm(final);
  };

  const detected = result ? MOODS.find(m => m.key === result.mood)! : null;

  return (
    <div className="min-h-screen pb-32 animate-fade-in">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">Mood scan</h1>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Frames stay on your device — nothing is uploaded. We'll suggest a mood; you confirm.
        </p>

        <div className="relative aspect-square w-full max-w-sm mx-auto rounded-[2rem] overflow-hidden bg-muted shadow-soft">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-center p-6 text-sm text-muted-foreground">
              {error}
            </div>
          ) : (
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          )}
          {scanning && (
            <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-primary/20 animate-pulse pointer-events-none" />
          )}
          <div className="absolute inset-3 rounded-[1.6rem] border-2 border-card/60 pointer-events-none" />
        </div>

        {!result ? (
          <Button
            onClick={scan}
            disabled={!ready || scanning}
            size="lg"
            className="w-full rounded-full gradient-sky text-primary-foreground border-0 shadow-glow hover:opacity-95"
          >
            {scanning ? (<><Sparkles className="h-4 w-4 mr-2 animate-pulse" /> Reading expression…</>) : (<><Camera className="h-4 w-4 mr-2" /> Scan now</>)}
          </Button>
        ) : (
          <div className="space-y-5 animate-scale-in">
            <div className="rounded-3xl bg-card border border-border p-5 text-center shadow-card">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Detected</div>
              <div className="text-5xl mb-2">{detected!.emoji}</div>
              <div className="font-semibold text-lg">{detected!.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Confidence {Math.round(result.confidence * 100)}%
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Confirm or change</h3>
              <MoodPicker value={override} onChange={setOverride} />
            </div>

            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" className="rounded-full flex-1">
                <RotateCcw className="h-4 w-4 mr-1" /> Rescan
              </Button>
              <Button onClick={confirm} className="rounded-full flex-1 gradient-sky text-primary-foreground border-0">
                Use this mood
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
