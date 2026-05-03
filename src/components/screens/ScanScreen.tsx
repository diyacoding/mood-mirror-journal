import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOODS, MoodKey } from "@/lib/moodStore";
import {
  detectMoodFromVideo,
  initFaceLandmarker,
  type DetectionResult,
} from "@/lib/faceMood";
import { MoodPicker } from "@/components/MoodPicker";
import { toast } from "sonner";

// Firebase
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  onBack: () => void;
  onConfirm: (m: MoodKey) => void;
}

export const ScanScreen = ({ onBack, onConfirm }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [override, setOverride] = useState<MoodKey | undefined>();

  // CAMERA + MODEL INIT
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await initFaceLandmarker();
        if (!cancelled) setLoading(false);

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
        setError(e?.message || "Camera or model failed to load");
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // SCAN MOOD
  const scan = async () => {
    if (!videoRef.current || !ready || loading) return;

    setScanning(true);

    try {
      await new Promise((r) => setTimeout(r, 400));

      const r = await detectMoodFromVideo(videoRef.current);

      setResult(r);
      setOverride(r.faceDetected ? r.mood : undefined);
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setResult(null);
    setOverride(undefined);
  };

  // 🚀 FIREBASE SAVE (ONLY SOURCE OF TRUTH)
  const confirm = async () => {
    console.log("👉 CONFIRM BUTTON CLICKED");
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
        confidence: result.confidence,
        source: "scan",
        createdAt: new Date().toISOString(),
      });

      console.log("✅ SAVED:", docRef.id);

      toast.success("Mood saved ✨");

      onConfirm(final);
    } catch (e: any) {
      console.error("❌ FIREBASE ERROR:", e);
      toast.error("Save failed");
    }
  };

  const detected = result?.faceDetected
    ? MOODS.find((m) => m.key === result.mood)
    : null;

  return (
    <div className="min-h-screen pb-32">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b">
        <div className="px-5 py-4 flex items-center gap-3">
          <button onClick={onBack}>
            <ArrowLeft />
          </button>
          <h1 className="font-semibold">Mood Scan</h1>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-6">
        {/* CAMERA */}
        <div className="relative aspect-square w-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-muted">
          {error ? (
            <div className="p-6 text-sm text-center text-muted-foreground">
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

        {/* SCAN BUTTON */}
        {!result ? (
          <Button
            onClick={scan}
            disabled={!ready || loading || scanning}
            className="w-full"
          >
            {scanning ? "Scanning..." : "Scan Mood"}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* RESULT */}
            <div className="text-center">
              <div className="text-4xl">{detected?.emoji}</div>
              <div className="font-semibold">{detected?.label}</div>
            </div>

            {/* OVERRIDE */}
            <MoodPicker value={override} onChange={setOverride} />

            {/* ACTIONS */}
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
