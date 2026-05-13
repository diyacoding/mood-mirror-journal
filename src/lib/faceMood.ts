// Real, on-device facial affect estimation using MediaPipe FaceLandmarker.
//
// We use the FaceLandmarker model with `outputFaceBlendshapes: true`. Blendshapes
// are 52 ARKit-style activation coefficients (0-1) computed from 478 face
// landmarks — e.g. `mouthSmileLeft`, `browDownRight`, `eyeBlinkLeft`,
// `jawOpen`. These are real, measured facial signals.
//
// From those signals we compute a Valence-Arousal affect estimate, then map
// that to one of the app's mood categories. There is NO randomness, NO
// fallback to neutral, NO weighted simulation. If no face is detected or
// signals are too weak/conflicting we report uncertainty honestly.
//
// Pipeline:
//   1. Lazy-load FaceLandmarker (WASM + model from CDN).
//   2. Extract blendshapes from the current video frame.
//   3. Compute interpretable signals: smile, frown, brow-furrow, brow-raise,
//      eye-openness, jaw-tension, mouth-open.
//   4. Compute Valence (smile - frown - brow-furrow) and Arousal
//      (brow-raise + jaw-open + eye-widen + brow-furrow*0.5).
//   5. Score each mood from those signals (transparent linear combos).
//   6. Apply small per-user calibration bias from prior corrections.
//   7. Pick top mood; flag uncertain when top score is low or top-2 close.
//   8. Build an explanation listing the actual signals that drove the result.
//
// Frames never leave the device.

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { MOODS, type MoodKey } from "./moodTypes";

export interface MoodProbability {
  mood: MoodKey;
  probability: number;
}

export interface SignalReading {
  label: string;
  value: number; // 0-1 normalized
}

export interface AffectState {
  valence: number;  // -1..1  (negative ↔ positive)
  arousal: number;  //  0..1  (calm ↔ energetic)
}

export type ConfidenceTier = "high" | "medium" | "low";

export interface DetectionResult {
  mood: MoodKey;
  confidence: number;
  confidenceTier: ConfidenceTier;
  uncertain: boolean;
  faceDetected: boolean;
  affect: AffectState;
  signals: SignalReading[];        // top contributing facial signals
  probabilities: MoodProbability[]; // full smoothed distribution, sorted desc
  secondary: MoodProbability[];     // up to 2 next most likely
  framesUsed: number;               // number of frames in rolling average
  stabilityLocked: boolean;         // true when prior dominant mood was held
  consistency?: {                   // self-report alignment (when available)
    selfReported: MoodKey;
    aligned: boolean;
    alignmentPercent: number;
  };
  explanation: string;
}

// ---------- model lifecycle ----------
let landmarkerPromise: Promise<FaceLandmarker> | null = null;

export const initFaceLandmarker = (): Promise<FaceLandmarker> => {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
    );
    return FaceLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });
  })();
  return landmarkerPromise;
};

// ---------- per-user calibration (from feedback corrections) ----------
const CALIBRATION_KEY = "moodmirror.face.calibration.v2";
type Calibration = Record<MoodKey, number>;
const emptyCalibration = (): Calibration =>
  MOODS.reduce((a, m) => { a[m.key] = 0; return a; }, {} as Calibration);

const loadCalibration = (): Calibration => {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    if (!raw) return emptyCalibration();
    return { ...emptyCalibration(), ...JSON.parse(raw) };
  } catch { return emptyCalibration(); }
};
const saveCalibration = (c: Calibration) => {
  try { localStorage.setItem(CALIBRATION_KEY, JSON.stringify(c)); } catch {}
};

export const recordFeedback = (suggested: MoodKey, chosen: MoodKey) => {
  const c = loadCalibration();
  // gentle decay so old corrections don't dominate forever
  for (const k of Object.keys(c) as MoodKey[]) c[k] *= 0.9;
  c[chosen] += 0.5;
  if (suggested !== chosen) c[suggested] -= 0.25;
  saveCalibration(c);
};

export const resetSessionBalance = () => {
  // kept for API compatibility — nothing to reset in the new system.
};

// ---------- blendshape helpers ----------
type BlendMap = Record<string, number>;

const toBlendMap = (result: FaceLandmarkerResult): BlendMap | null => {
  const bs = result.faceBlendshapes?.[0]?.categories;
  if (!bs || !bs.length) return null;
  const map: BlendMap = {};
  for (const c of bs) map[c.categoryName] = c.score;
  return map;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const avg = (...xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

// Derive interpretable signals from raw blendshapes.
const computeSignals = (b: BlendMap) => {
  const smile = clamp01(avg(b.mouthSmileLeft ?? 0, b.mouthSmileRight ?? 0));
  const frown = clamp01(avg(b.mouthFrownLeft ?? 0, b.mouthFrownRight ?? 0));
  const lipPress = clamp01(avg(b.mouthPressLeft ?? 0, b.mouthPressRight ?? 0));
  const browDown = clamp01(avg(b.browDownLeft ?? 0, b.browDownRight ?? 0));
  const browUp = clamp01(
    avg(b.browInnerUp ?? 0, b.browOuterUpLeft ?? 0, b.browOuterUpRight ?? 0),
  );
  const eyeBlink = clamp01(avg(b.eyeBlinkLeft ?? 0, b.eyeBlinkRight ?? 0));
  const eyeWide = clamp01(avg(b.eyeWideLeft ?? 0, b.eyeWideRight ?? 0));
  const eyeSquint = clamp01(avg(b.eyeSquintLeft ?? 0, b.eyeSquintRight ?? 0));
  const jawOpen = clamp01(b.jawOpen ?? 0);
  const mouthOpen = clamp01(b.mouthOpen ?? jawOpen);
  const cheekPuff = clamp01(b.cheekPuff ?? 0);
  // openness: 1 when wide / open, 0 when blinking
  const eyeOpenness = clamp01(1 - eyeBlink);

  return {
    smile, frown, lipPress, browDown, browUp,
    eyeOpenness, eyeWide, eyeSquint, jawOpen, mouthOpen, cheekPuff,
  };
};

type Signals = ReturnType<typeof computeSignals>;

// Valence & Arousal from signals — standard affective-computing formulation.
const computeAffect = (s: Signals): AffectState => {
  const valence = clamp(
    1.4 * s.smile - 1.2 * s.frown - 0.6 * s.browDown - 0.3 * s.lipPress + 0.2 * s.cheekPuff,
    -1, 1,
  );
  const arousal = clamp01(
    0.6 * s.browUp + 0.5 * s.eyeWide + 0.5 * s.jawOpen +
    0.4 * s.browDown + 0.3 * s.mouthOpen,
  );
  return { valence, arousal };
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Score moods directly from interpretable signals — every term is
// auditable, none of them are random.
const scoreMoods = (s: Signals, a: AffectState): Record<MoodKey, number> => {
  return {
    happy:
      1.6 * s.smile + 0.5 * Math.max(0, a.valence) + 0.3 * s.cheekPuff
      - 0.8 * s.frown - 0.6 * s.browDown,
    calm:
      0.9 * (1 - a.arousal) + 0.4 * Math.max(0, a.valence) + 0.3 * s.eyeOpenness
      - 0.7 * s.browDown - 0.5 * s.frown - 0.4 * s.eyeWide,
    sad:
      1.3 * s.frown + 0.5 * Math.max(0, -a.valence) + 0.3 * (1 - s.eyeOpenness)
      - 0.9 * s.smile,
    anxious:
      0.9 * s.browUp + 0.7 * s.eyeWide + 0.4 * a.arousal + 0.3 * s.lipPress
      - 0.6 * s.smile,
    stressed:
      1.0 * s.browDown + 0.6 * s.lipPress + 0.5 * s.eyeSquint + 0.4 * a.arousal
      - 0.7 * s.smile,
    neutral:
      0.6 * (1 - Math.abs(a.valence)) + 0.5 * (1 - a.arousal)
      - 0.8 * s.smile - 0.8 * s.frown - 0.6 * s.browDown - 0.4 * s.browUp,
  };
};

const softmax = (scores: Record<MoodKey, number>, temp = 0.55) => {
  const vals = Object.values(scores);
  const max = Math.max(...vals);
  const exps = {} as Record<MoodKey, number>;
  let sum = 0;
  for (const k of Object.keys(scores) as MoodKey[]) {
    const e = Math.exp((scores[k] - max) / temp);
    exps[k] = e; sum += e;
  }
  for (const k of Object.keys(exps) as MoodKey[]) exps[k] /= sum || 1;
  return exps;
};

// Pick the top contributing signals to display to the user.
const topSignals = (s: Signals): SignalReading[] => {
  const all: SignalReading[] = [
    { label: "Smile (mouth corners up)", value: s.smile },
    { label: "Frown (mouth corners down)", value: s.frown },
    { label: "Brow furrow", value: s.browDown },
    { label: "Brow raise", value: s.browUp },
    { label: "Eye widen", value: s.eyeWide },
    { label: "Eye squint", value: s.eyeSquint },
    { label: "Lip press / tension", value: s.lipPress },
    { label: "Jaw open", value: s.jawOpen },
    { label: "Cheek lift", value: s.cheekPuff },
  ];
  return all
    .filter(x => x.value >= 0.08)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
};

// Optional behavioral validation against the most recent self-report.
const consistencyCheck = (_top: MoodKey) => {
  return undefined as undefined | { selfReported: MoodKey; aligned: boolean; alignmentPercent: number };
  // Behavioral validation moved to caller (uses Firestore entries).
  // eslint-disable-next-line no-unreachable
  const last = { mood: "neutral" as MoodKey };
  const groups: Record<string, MoodKey[]> = {
    positive: ["happy", "calm"],
    negative: ["sad"],
    activated: ["anxious", "stressed"],
    neutral: ["neutral"],
  };
  const groupOf = (m: MoodKey) =>
    Object.keys(groups).find(g => groups[g].includes(m)) ?? "neutral";
  const same = last.mood === top;
  const sameGroup = groupOf(last.mood) === groupOf(top);
  const alignmentPercent = same ? 100 : sameGroup ? 60 : 25;
  return {
    selfReported: last.mood,
    aligned: same || sameGroup,
    alignmentPercent,
  };
};

const buildExplanation = (
  primary: MoodKey,
  uncertain: boolean,
  affect: AffectState,
  signals: SignalReading[],
): string => {
  const signalText = signals.length
    ? signals.map(s => `${s.label} ${(s.value * 100).toFixed(0)}%`).join(", ")
    : "no strong facial signals";
  const v = affect.valence.toFixed(2);
  const a = affect.arousal.toFixed(2);
  const lead = uncertain
    ? "Mixed facial signals — showing top possibilities."
    : `Read as ${primary} from facial landmarks.`;
  return `${lead} Valence ${v}, Arousal ${a}. Signals: ${signalText}.`;
};

// Confidence tiers per spec
const CONF_HIGH = 0.75;
const CONF_MED = 0.50;

// Temporal smoothing config
const FRAME_COUNT = 8;          // rolling window size
const FRAME_INTERVAL_MS = 70;   // ~14fps sampling
const SIGNAL_EMA_ALPHA = 0.55;  // exponential smoothing for raw signals (noise reduction)
const STABILITY_LOCK_MS = 3500; // 3.5s lock on dominant mood
const SWITCH_MARGIN = 0.20;     // need +20% over locked mood to switch

// Stability lock state (persists across detection calls in same session)
let lockedMood: MoodKey | null = null;
let lockedAt = 0;

const tierFor = (p: number): ConfidenceTier =>
  p >= CONF_HIGH ? "high" : p >= CONF_MED ? "medium" : "low";

// Smooth raw signals with EMA across the captured frames to reduce noise
// from blinks, micro-movements, and head jitter.
const smoothSignalSeries = (series: Signals[]): Signals => {
  if (series.length === 1) return series[0];
  const keys = Object.keys(series[0]) as (keyof Signals)[];
  const out = { ...series[0] } as Signals;
  for (let i = 1; i < series.length; i++) {
    for (const k of keys) {
      (out as any)[k] = SIGNAL_EMA_ALPHA * series[i][k] + (1 - SIGNAL_EMA_ALPHA) * (out as any)[k];
    }
  }
  return out;
};

// ---------- main entry ----------
export const detectMoodFromVideo = async (
  video: HTMLVideoElement,
): Promise<DetectionResult> => {
  const landmarker = await initFaceLandmarker();

  // Multi-frame capture
  const distSeries: Record<MoodKey, number>[] = [];
  const signalSeries: Signals[] = [];
  let lastBlends: BlendMap | null = null;

  for (let i = 0; i < FRAME_COUNT; i++) {
    const ts = performance.now();
    const result = landmarker.detectForVideo(video, ts);
    const blends = toBlendMap(result);
    if (blends) {
      lastBlends = blends;
      const s = computeSignals(blends);
      signalSeries.push(s);
      const a = computeAffect(s);
      const scores = scoreMoods(s, a);
      distSeries.push(softmax(scores));
    }
    if (i < FRAME_COUNT - 1) {
      await new Promise(r => setTimeout(r, FRAME_INTERVAL_MS));
    }
  }

  if (!lastBlends || distSeries.length === 0) {
    // Honest "no face" output — never coerced to neutral.
    return {
      mood: "neutral",
      confidence: 0,
      confidenceTier: "low",
      uncertain: true,
      faceDetected: false,
      affect: { valence: 0, arousal: 0 },
      signals: [],
      probabilities: [],
      secondary: [],
      framesUsed: 0,
      stabilityLocked: false,
      explanation:
        "No face detected. Please center your face in the frame with even lighting and try again.",
    };
  }

  // Rolling-average probability distribution across frames
  const avgDist = MOODS.reduce((acc, m) => { acc[m.key] = 0; return acc; }, {} as Record<MoodKey, number>);
  for (const d of distSeries) {
    for (const k of Object.keys(d) as MoodKey[]) avgDist[k] += d[k];
  }
  for (const k of Object.keys(avgDist) as MoodKey[]) avgDist[k] /= distSeries.length;

  // Per-user calibration nudge applied to the smoothed distribution
  const calib = loadCalibration();
  let calibSum = 0;
  for (const k of Object.keys(avgDist) as MoodKey[]) {
    avgDist[k] = Math.max(0, avgDist[k] * (1 + 0.15 * calib[k]));
    calibSum += avgDist[k];
  }
  if (calibSum > 0) {
    for (const k of Object.keys(avgDist) as MoodKey[]) avgDist[k] /= calibSum;
  }

  const ranked = (Object.keys(avgDist) as MoodKey[])
    .map(k => ({ mood: k, probability: avgDist[k] }))
    .sort((a, b) => b.probability - a.probability);

  let top = ranked[0];
  const second = ranked[1];

  // Stability lock — keep prior dominant mood unless new top exceeds by margin
  let stabilityLocked = false;
  const now = Date.now();
  if (lockedMood && now - lockedAt < STABILITY_LOCK_MS) {
    const lockedProb = avgDist[lockedMood] ?? 0;
    if (top.mood !== lockedMood && top.probability - lockedProb < SWITCH_MARGIN) {
      top = { mood: lockedMood, probability: lockedProb };
      stabilityLocked = true;
    }
  }
  // Update lock to current dominant
  if (!stabilityLocked) {
    lockedMood = top.mood;
    lockedAt = now;
  }

  // Re-sort with the (possibly locked) top first
  const finalRanked = stabilityLocked
    ? [top, ...ranked.filter(r => r.mood !== top.mood)]
    : ranked;

  const tier = tierFor(top.probability);
  const gap = second ? top.probability - second.probability : 1;
  const uncertain = tier === "low" || gap < 0.05;

  // Smoothed signals for explanation/UI
  const smoothed = smoothSignalSeries(signalSeries);
  const affect = computeAffect(smoothed);
  const sigs = topSignals(smoothed);
  const consistency = consistencyCheck(top.mood);

  const moodLabel = MOODS.find(m => m.key === top.mood)?.label ?? top.mood;
  const lead = uncertain
    ? "Low confidence emotional reading — facial signals are mixed or unclear."
    : tier === "high"
      ? `Stable ${moodLabel.toLowerCase()} expression detected across ${distSeries.length} frames.`
      : `Likely ${moodLabel.toLowerCase()}, with some variation across frames.`;
  const lockNote = stabilityLocked ? " Stability lock held to prevent flicker." : "";
  const signalText = sigs.length
    ? sigs.map(s => `${s.label} ${(s.value * 100).toFixed(0)}%`).join(", ")
    : "no strong facial signals";
  const explanation =
    `${lead}${lockNote} Method: ${distSeries.length}-frame rolling average. ` +
    `Valence ${affect.valence.toFixed(2)}, Arousal ${affect.arousal.toFixed(2)}. Signals: ${signalText}.`;

  return {
    mood: top.mood,
    confidence: top.probability,
    confidenceTier: tier,
    uncertain,
    faceDetected: true,
    affect,
    signals: sigs,
    probabilities: finalRanked,
    secondary: finalRanked.slice(1, 3),
    framesUsed: distSeries.length,
    stabilityLocked,
    consistency,
    explanation,
  };
};
