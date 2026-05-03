import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, RotateCcw, Sparkles, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOODS, MoodKey } from "@/lib/moodStore";
import {
  detectMoodFromVideo,
  initFaceLandmarker,
  recordFeedback,
  type DetectionResult,
} from "@/lib/faceMood";
import { MoodPicker } from "@/components/MoodPicker";
import { toast } from "sonner";

// ✅ FIREBASE IMPORTS
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

interface Props {
  onBack: () => void;
  onConfirm: (m: MoodKey) => void;
}

export const ScanScreen = ({ onBack, onConfirm }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [override, setOverride] = useState<MoodKey | undefined>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      initFaceLandmarker()
        .then(() => !cancelled && setModelLoading(false))
        .catch((e) =>
          !cancelled && setError(`Could not load face model: ${e?.message ?? e}`)
        );

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 480, height: 480 },
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
        setError(e?.message || "Camera unavailable.");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const scan = async () => {
    if (!videoRef.current || !ready || modelLoading) return;

    setScanning(true);

    try {
      await new Promise((r) => setTimeout(r, 400));
      const r = await detectMoodFromVideo(videoRef.current);
      setResult(r);
      setOverride(r.faceDetected ? r.mood : undefined);
    } catch (e: any) {
      toast.error(`Detection failed: ${e?.message ?? e}`);
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setResult(null);
    setOverride(undefined);
  };

  // 🚀 FIREBASE FIXED SAVE
  const confirm = async () => {
    const final = override ?? result?.mood;

    if (!final || !result) {
      toast.error("Pick a mood first");
      return;
    }

    try {
      console.log("🔥 SAVING TO FIREBASE...");

      const docRef = await addDoc(collection(db, "mood_entries"), {
        mood: final,
        intensity: Math.round((result.confidence ?? 0.6) * 10),
        source: "scan",
        confidence: result.confidence,
        createdAt: new Date().toISOString(),
      });

      console.log("✅ SAVED:", docRef.id);

      toast.success("Mood saved successfully ✨");

      onConfirm(final);
    } catch (e: any) {
      console.error("❌ FIREBASE ERROR:", e);
      toast.error("Could not save mood");
    }
  };

  const detected = result?.faceDetected
    ? MOODS.find((m) => m.key === result.mood)!
    : null;

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
        <div className="relative aspect-square w-full max-w-sm mx-auto rounded-[2rem] overflow-hidden bg-muted shadow-soft">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}

          {scanning && (
            <div className="absolute inset-0 bg-primary/20 animate-pulse" />
          )}
        </div>

        {!result ? (
          <Button
            onClick={scan}
            disabled={!ready || scanning || modelLoading}
            className="w-full"
          >
            {scanning ? "Scanning..." : "Scan Mood"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl">{detected?.emoji}</div>
              <div className="font-semibold">{detected?.label}</div>
            </div>

            <MoodPicker value={override} onChange={setOverride} />

            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" className="flex-1">
                Retake
              </Button>
              <Button onClick={confirm} className="flex-1">
                Save Mood
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
