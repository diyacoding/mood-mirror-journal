import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOODS, MoodKey } from "@/lib/moodStore";
import {
  detectMoodFromVideo,
  initFaceLandmarker,
  type DetectionResult,
} from "@/lib/faceMood";
import { MoodPicker } from "@/components/MoodPicker";
import { toast } from "sonner";

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
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [override, setOverride] = useState<MoodKey | undefined>();
  const [saving, setSaving] = useState(false);

  // CAMERA + MODEL
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

  // SCAN
  const scan = async () => {
    if (!videoRef.current || !ready || loading) return;

    try {
      const r = await detectMoodFromVideo(videoRef.current);
      setResult(r);
      setOverride(r.faceDetected ? r.mood : undefined);
    } catch (e: any) {
      toast.error("Scan failed");
    }
  };

  // RESET
  const reset = () => {
    setResult(null);
    setOverride(undefined);
  };

  // SAVE TO FIREBASE (ONLY PLACE SAVING HAPPENS)
  const confirm = async () => {
    const final = override ?? result?.mood;

    if (!final || !result) {
      toast.error("Pick a mood first");
      return;
    }

    setSaving(true);

    try {
      const docRef = await addDoc(collection(db, "mood_entries"), {
        mood: final,
        intensity: Math.round((result.confidence ?? 0.5) * 10),
        confidence: result.confidence,
        source: "scan",
        createdAt: new Date().toISOString(),
      });

      console.log("SAVED:", docRef.id);

      toast.success("Mood saved ✨");
      onConfirm(final);
    } catch (e: any) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const detected = result?.faceDetected
    ? MOODS.find((m) => m.key === result.mood)
    : null;

  return (
    <div className="min-h-screen pb-32">
      {/* HEADER */}
      <header className="p-4 border-b flex items-center gap-2">
        <button onClick={onBack}>
          <ArrowLeft />
        </button>
        <h1 className="font-semibold">Mood Scan</h1>
      </header>

      {/* CAMERA */}
      <div className="p-5">
        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-200">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        </div>

        {/* SCAN BUTTON */}
        {!result ? (
          <Button
            onClick={scan}
            disabled={!ready || loading}
            className="w-full mt-4"
          >
            Scan Mood
          </Button>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="text-center text-3xl">
              {detected?.emoji}
            </div>

            <MoodPicker value={override} onChange={setOverride} />

            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" className="flex-1">
                Retake
              </Button>

              <Button
                onClick={confirm}
                className="flex-1"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Mood"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
