import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, RotateCcw, Sparkles, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOODS, MoodKey, getEntry, todayKey, upsertEntry } from "@/lib/moodStore";
import {
  detectMoodFromVideo,
  initFaceLandmarker,
  recordFeedback,
  type DetectionResult,
} from "@/lib/faceMood";
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
  const [modelLoading, setModelLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [override, setOverride] = useState<MoodKey | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Kick off model load in parallel with camera permission.
      initFaceLandmarker()
        .then(() => !cancelled && setModelLoading(false))
        .catch((e) => !cancelled && setError(`Could not load face model: ${e?.message ?? e}`));

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

  const scan = async () => {
    if (!videoRef.current || !ready || modelLoading) return;
    setScanning(true);
    try {
      // Brief warm-up so the user sees feedback and the video has fresh frames.
      await new Promise(r => setTimeout(r, 400));
      const r = await detectMoodFromVideo(videoRef.current);
      setResult(r);
      setOverride(r.faceDetected ? r.mood : undefined);
    } catch (e: any) {
      toast.error(`Detection failed: ${e?.message ?? e}`);
    } finally {
      setScanning(false);
    }
  };

  const reset = () => { setResult(null); setOverride(undefined); };

  const confirm = () => {
    const final = override ?? result?.mood;
    if (!final || !result) {
      toast.error("Pick a mood first");
      return;
    }
    try {
      if (result.faceDetected) recordFeedback(result.mood, final);
      const today = todayKey();
      const existing = getEntry(today);
      const intensity = existing?.intensity ?? Math.round((result.confidence ?? 0.6) * 10);
      upsertEntry({
        date: today,
        mood: final,
        intensity: Math.max(1, Math.min(10, intensity)),
        note: existing?.note,
        behaviors: existing?.behaviors ?? {},
        createdAt: existing?.createdAt ?? Date.now(),
      });
      console.info("[MoodMirror] Scan entry saved", { date: today, mood: final });
      toast.success("Mood saved successfully ✨");
      onConfirm(final);
    } catch (e: any) {
      console.error("[MoodMirror] Save failed", e);
      toast.error(`Could not save mood: ${e?.message ?? e}`);
    }
  };

  const detected = result?.faceDetected ? MOODS.find(m => m.key === result.mood)! : null;

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
          On-device face landmark analysis (MediaPipe). Frames never leave your device.
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
            disabled={!ready || scanning || modelLoading}
            size="lg"
            className="w-full rounded-full gradient-sky text-primary-foreground border-0 shadow-glow hover:opacity-95"
          >
            {modelLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading face model…</>
            ) : scanning ? (
              <><Sparkles className="h-4 w-4 mr-2 animate-pulse" /> Analyzing landmarks…</>
            ) : (
              <><Camera className="h-4 w-4 mr-2" /> Scan now</>
            )}
          </Button>
        ) : !result.faceDetected ? (
          <div className="space-y-4 animate-scale-in">
            <div className="rounded-3xl bg-card border border-border p-5 shadow-card text-center">
              <HelpCircle className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <div className="font-semibold">No face detected</div>
              <p className="text-xs text-muted-foreground mt-2">{result.explanation}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" className="rounded-full flex-1">
                <RotateCcw className="h-4 w-4 mr-1" /> Try again
              </Button>
              <Button onClick={onBack} className="rounded-full flex-1">
                Log manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-scale-in">
            <div className="rounded-3xl bg-card border border-border p-5 shadow-card">
              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center justify-center gap-1">
                  {result.confidenceTier === "low" ? (
                    <><HelpCircle className="h-3 w-3" /> Uncertain emotional state</>
                  ) : result.confidenceTier === "medium" ? (
                    <><HelpCircle className="h-3 w-3" /> Possible match</>
                  ) : (
                    <>Detected</>
                  )}
                </div>
                {result.confidenceTier === "low" ? (
                  <>
                    <div className="text-5xl mb-2">🤔</div>
                    <div className="font-semibold text-lg">Low confidence reading</div>
                    <div className="text-xs text-muted-foreground mt-2 px-4">
                      Facial signals are mixed or unclear. Top possibilities:
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      {result.probabilities.slice(0, 3).map(p => {
                        const m = MOODS.find(x => x.key === p.mood)!;
                        return (
                          <div key={p.mood} className="flex justify-center items-center gap-2">
                            <span>{m.emoji} {m.label}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {Math.round(p.probability * 100)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : result.confidenceTier === "medium" ? (
                  <>
                    <div className="text-4xl mb-2">{detected!.emoji}</div>
                    <div className="font-semibold text-lg">{detected!.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Confidence {Math.round(result.confidence * 100)}% · top 2 shown
                    </div>
                    <div className="mt-3 flex justify-center gap-4 text-sm">
                      {result.probabilities.slice(0, 2).map(p => {
                        const m = MOODS.find(x => x.key === p.mood)!;
                        return (
                          <div key={p.mood} className="flex items-center gap-1">
                            <span>{m.emoji} {m.label}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {Math.round(p.probability * 100)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-5xl mb-2">{detected!.emoji}</div>
                    <div className="font-semibold text-lg">{detected!.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Confidence {Math.round(result.confidence * 100)}%
                    </div>
                  </>
                )}
                <div className="text-[10px] text-muted-foreground mt-2">
                  Method: {result.framesUsed}-frame rolling average
                  {result.stabilityLocked ? " · stability lock active" : ""}
                </div>
              </div>

              {/* Affect (Valence / Arousal) */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Valence</div>
                  <div className="text-sm font-medium mt-1">
                    {result.affect.valence >= 0 ? "+" : ""}{result.affect.valence.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">negative ↔ positive</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Arousal</div>
                  <div className="text-sm font-medium mt-1">{result.affect.arousal.toFixed(2)}</div>
                  <div className="text-[10px] text-muted-foreground">calm ↔ energetic</div>
                </div>
              </div>

              {/* Probability breakdown */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                  Probability breakdown
                </div>
                <div className="space-y-1.5">
                  {result.probabilities.map((p) => {
                    const m = MOODS.find(x => x.key === p.mood)!;
                    const pct = Math.round(p.probability * 100);
                    return (
                      <div key={p.mood} className="flex items-center gap-2 text-xs">
                        <span className="w-20 shrink-0">{m.emoji} {m.label}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right tabular-nums text-muted-foreground">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Facial signals */}
              {result.signals.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    Facial signals
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.signals.map((s) => (
                      <span key={s.label} className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground/80">
                        {s.label} · {Math.round(s.value * 100)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mood Consistency Check */}
              {result.consistency && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    Mood consistency check
                  </div>
                  <div className="text-xs text-foreground/80">
                    Last self-report: <span className="font-medium">
                      {MOODS.find(m => m.key === result.consistency!.selfReported)?.label}
                    </span> · alignment {result.consistency.alignmentPercent}%
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                {result.explanation}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                Was this accurate? Confirm or change
              </h3>
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
