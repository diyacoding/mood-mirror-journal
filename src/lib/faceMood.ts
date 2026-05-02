// On-device probabilistic facial mood estimator.
//
// Pipeline per scan:
//   1. Sample visual signals from the frame (brightness, warmth, variance,
//      color skew). Multiple frames are averaged when possible to reduce
//      single-frame noise.
//   2. Convert signals → mood scores using SOFT, overlapping mappings (no
//      hard if/else). Neutral and Stressed/Anxious have NO score advantage.
//   3. Apply learned user-feedback bias (corrections nudge future weights).
//   4. Apply behavior-adjustment layer (sleep / exercise / screen time)
//      from the most recent log entry. This is a small modulator, never
//      the primary signal.
//   5. Apply anti-repetition dampening based on the last 2 emitted moods.
//   6. Apply session-level natural-frequency balancing.
//   7. Inject small controlled randomness (Dirichlet-style jitter) so
//      consecutive scans aren't identical when signals are similar.
//   8. If the top probability is too low or top-2 are too close → return
//      an "uncertain" mixed result (primary + secondaries) instead of a
//      forced single label. Neutral/Stressed/Anxious are NEVER used as
//      a fallback — uncertainty is its own state.
//   9. Build a short human-readable explanation from the dominant signals
//      + behavior adjustments that contributed.
//
// Frames never leave the device.

import { MOODS, type MoodKey, loadEntries } from "./moodStore";

export interface MoodProbability {
  mood: MoodKey;
  probability: number; // 0-1
}

export interface DetectionResult {
  mood: MoodKey;                     // top sampled mood
  confidence: number;                // 0-1
  uncertain: boolean;                // true when signals are mixed
  secondary: MoodProbability[];      // up to 2 next-most-likely
  distribution: Record<MoodKey, number>;
  explanation: string;               // short human reason
}

// ---------- storage keys ----------
const FEEDBACK_KEY = "moodmirror.face.feedback.v1";
const SESSION_KEY = "moodmirror.face.session.v1";
const RECENT_KEY = "moodmirror.face.recent.v1";

// ---------- tunables ----------
const TEMPERATURE = 0.85;            // softer → fewer landslide picks
const FEEDBACK_STRENGTH = 0.30;
const PRIOR = 0.04;
const BALANCE_STRENGTH = 0.7;
const FEEDBACK_OVERRIDE = 1.5;
const REPEAT_DAMP_LAST = 0.55;       // multiply prob of mood == last scan
const REPEAT_DAMP_PREV = 0.75;       // multiply prob of mood == 2 scans ago
const NOISE_STRENGTH = 0.12;         // jitter magnitude on probabilities
const UNCERTAIN_TOP_THRESHOLD = 0.42;
const UNCERTAIN_GAP_THRESHOLD = 0.08;

// Equal natural frequencies — no built-in bias toward any mood.
const NATURAL_FREQ: Record<MoodKey, number> = {
  happy: 1 / 6,
  calm: 1 / 6,
  neutral: 1 / 6,
  anxious: 1 / 6,
  stressed: 1 / 6,
  sad: 1 / 6,
};

// ---------- session counts (for frequency balancing) ----------
type SessionCounts = Record<MoodKey, number>;
const emptyCounts = (): SessionCounts =>
  MOODS.reduce((a, m) => { a[m.key] = 0; return a; }, {} as SessionCounts);

const loadSession = (): SessionCounts => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return emptyCounts();
    return { ...emptyCounts(), ...JSON.parse(raw) };
  } catch { return emptyCounts(); }
};
const saveSession = (c: SessionCounts) => {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(c)); } catch {}
};
export const resetSessionBalance = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(RECENT_KEY);
  } catch {}
};

// ---------- recent emissions (for anti-repetition) ----------
const loadRecent = (): MoodKey[] => {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const pushRecent = (m: MoodKey) => {
  const arr = [m, ...loadRecent()].slice(0, 3);
  try { sessionStorage.setItem(RECENT_KEY, JSON.stringify(arr)); } catch {}
};

// ---------- feedback bias (learning loop) ----------
type Bias = Record<MoodKey, number>;
const emptyBias = (): Bias =>
  MOODS.reduce((a, m) => { a[m.key] = 0; return a; }, {} as Bias);

const loadBias = (): Bias => {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    if (!raw) return emptyBias();
    return { ...emptyBias(), ...JSON.parse(raw) };
  } catch { return emptyBias(); }
};
const saveBias = (b: Bias) => {
  try { localStorage.setItem(FEEDBACK_KEY, JSON.stringify(b)); } catch {}
};

export const recordFeedback = (suggested: MoodKey, chosen: MoodKey) => {
  const bias = loadBias();
  for (const k of Object.keys(bias) as MoodKey[]) bias[k] *= 0.92;
  bias[chosen] = (bias[chosen] ?? 0) + 1;
  if (suggested !== chosen) bias[suggested] = (bias[suggested] ?? 0) - 0.5;
  saveBias(bias);
};

// ---------- math helpers ----------
const softmax = (scores: Record<MoodKey, number>, temp = 1) => {
  const max = Math.max(...Object.values(scores));
  const exps = {} as Record<MoodKey, number>;
  let sum = 0;
  for (const k of Object.keys(scores) as MoodKey[]) {
    const e = Math.exp((scores[k] - max) / temp);
    exps[k] = e; sum += e;
  }
  for (const k of Object.keys(exps) as MoodKey[]) exps[k] /= sum || 1;
  return exps;
};

const sampleFrom = (dist: Record<MoodKey, number>): MoodKey => {
  const r = Math.random();
  let cum = 0;
  for (const k of Object.keys(dist) as MoodKey[]) {
    cum += dist[k];
    if (r <= cum) return k;
  }
  return (Object.keys(dist) as MoodKey[])[0];
};

const normalize = (d: Record<MoodKey, number>) => {
  let s = 0;
  for (const k of Object.keys(d) as MoodKey[]) s += d[k];
  if (s <= 0) return d;
  for (const k of Object.keys(d) as MoodKey[]) d[k] /= s;
  return d;
};

// ---------- visual scoring ----------
// Soft, overlapping mappings. Crucially, neutral and stressed/anxious have
// NO additive constant — they must earn their probability from signals.
const scoreFromSignals = (
  brightness: number,  // 0-1
  warmth: number,      // -1..1
  variance: number,    // ~0..0.5+
  greenSkew: number,   // g - (r+b)/2, normalized roughly -0.3..0.3
): Record<MoodKey, number> => {
  const b = brightness - 0.5;
  const v = variance;          // higher = more texture / motion
  const w = warmth;            // + warm, - cool
  return {
    happy:    1.9 * b + 1.6 * w - 0.5 * v + 0.4 * greenSkew,
    calm:     1.4 * Math.max(0, b) - 1.0 * v - 0.6 * Math.abs(w) + 0.6,
    neutral:  0.9 - 1.6 * Math.abs(b) - 1.1 * Math.abs(w) - 0.9 * v,
    anxious:  1.5 * v - 0.6 * b + 0.3 * Math.abs(w) - 0.4,
    stressed: 1.6 * v + 1.0 * Math.max(0, w) - 0.5 * b - 0.5,
    sad:     -1.7 * b - 1.0 * Math.max(0, w) - 0.3 * v + 0.2 * Math.max(0, -w),
  };
};

const sampleVariance = (data: Uint8ClampedArray): number => {
  let sum = 0, sumSq = 0, n = 0;
  for (let i = 0; i < data.length; i += 16) {
    const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
    sum += v; sumSq += v * v; n++;
  }
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sumSq / n - mean * mean));
};

// Sample one frame's signals.
const sampleFrame = (video: HTMLVideoElement) => {
  const canvas = document.createElement("canvas");
  const w = (canvas.width = 64);
  const h = (canvas.height = 64);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  r /= n; g /= n; b /= n;
  return {
    brightness: (r + g + b) / 3 / 255,
    warmth: (r - b) / 255,
    variance: sampleVariance(data) / 255,
    greenSkew: (g - (r + b) / 2) / 255,
  };
};

// ---------- behavior adjustment layer ----------
// Pulls signals from the most recent logged entry (if any). This is a small
// modulator — never the dominant force.
const behaviorAdjustments = (): { delta: Record<MoodKey, number>; reasons: string[] } => {
  const delta = emptyBias();
  const reasons: string[] = [];
  const entries = loadEntries();
  if (!entries.length) return { delta, reasons };
  const last = entries[entries.length - 1];
  const beh = last.behaviors || {};

  if (typeof beh.sleepHours === "number") {
    if (beh.sleepHours < 6) {
      delta.stressed += 0.35; delta.anxious += 0.25; delta.happy -= 0.2; delta.calm -= 0.15;
      reasons.push("low sleep");
    } else if (beh.sleepHours >= 7.5) {
      delta.calm += 0.25; delta.happy += 0.15; delta.stressed -= 0.15;
      reasons.push("good sleep");
    }
  }
  if (typeof beh.exerciseMinutes === "number" && beh.exerciseMinutes >= 20) {
    delta.calm += 0.2; delta.happy += 0.25; delta.stressed -= 0.2; delta.sad -= 0.15;
    reasons.push("recent exercise");
  }
  if (typeof beh.screenTimeHours === "number" && beh.screenTimeHours >= 6) {
    delta.stressed += 0.2; delta.anxious += 0.2; delta.calm -= 0.15;
    reasons.push("high screen time");
  }
  return { delta, reasons };
};

// ---------- explanation ----------
const explain = (
  primary: MoodKey,
  uncertain: boolean,
  signals: { brightness: number; warmth: number; variance: number },
  behaviorReasons: string[],
): string => {
  const visual: string[] = [];
  if (signals.brightness > 0.55) visual.push("bright lighting");
  else if (signals.brightness < 0.4) visual.push("low lighting");
  if (signals.warmth > 0.08) visual.push("warm tones");
  else if (signals.warmth < -0.05) visual.push("cool tones");
  if (signals.variance > 0.32) visual.push("active expression");
  else if (signals.variance < 0.15) visual.push("steady expression");

  const visualPart = visual.length ? `Visual cues: ${visual.join(", ")}.` : "";
  const behaviorPart = behaviorReasons.length
    ? ` Behavior factors: ${behaviorReasons.join(", ")}.`
    : "";
  const lead = uncertain
    ? "Signals are mixed — showing top possibilities."
    : `Leaning ${primary} based on the read.`;
  return `${lead} ${visualPart}${behaviorPart}`.trim();
};

// ---------- main entry ----------
export const detectMoodFromVideo = (video: HTMLVideoElement): DetectionResult => {
  // 1. Multi-frame sample (3 quick reads) to reduce single-frame noise.
  const frames = [sampleFrame(video), sampleFrame(video), sampleFrame(video)];
  const brightness = frames.reduce((s, f) => s + f.brightness, 0) / frames.length;
  const warmth = frames.reduce((s, f) => s + f.warmth, 0) / frames.length;
  const variance = frames.reduce((s, f) => s + f.variance, 0) / frames.length;
  const greenSkew = frames.reduce((s, f) => s + f.greenSkew, 0) / frames.length;

  // 2. Visual scores.
  const scores = scoreFromSignals(brightness, warmth, variance, greenSkew);

  // 3. Feedback bias.
  const bias = loadBias();
  for (const k of Object.keys(scores) as MoodKey[]) {
    scores[k] += FEEDBACK_STRENGTH * (bias[k] ?? 0);
  }

  // 4. Behavior-adjustment layer (small, additive in score-space).
  const { delta: behDelta, reasons: behReasons } = behaviorAdjustments();
  for (const k of Object.keys(scores) as MoodKey[]) {
    scores[k] += behDelta[k];
  }

  // 5. Softmax → distribution + prior floor.
  let dist = softmax(scores, TEMPERATURE);
  for (const k of Object.keys(dist) as MoodKey[]) dist[k] += PRIOR;
  dist = normalize(dist);

  // 6. Anti-repetition dampening (last 2 emitted).
  const recent = loadRecent();
  if (recent[0]) dist[recent[0]] *= REPEAT_DAMP_LAST;
  if (recent[1]) dist[recent[1]] *= REPEAT_DAMP_PREV;
  // If last two are identical, dampen even harder to break the loop.
  if (recent[0] && recent[0] === recent[1]) dist[recent[0]] *= 0.6;
  dist = normalize(dist);

  // 7. Session frequency balancing toward equal natural rates.
  const counts = loadSession();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const k of Object.keys(dist) as MoodKey[]) {
      const observed = counts[k] / total;
      const expected = NATURAL_FREQ[k];
      const ratio = (expected + 0.02) / (observed + 0.02);
      const strongFeedback = Math.abs(bias[k] ?? 0) >= FEEDBACK_OVERRIDE;
      const pull = strongFeedback ? BALANCE_STRENGTH * 0.3 : BALANCE_STRENGTH;
      dist[k] = dist[k] * Math.pow(ratio, pull);
    }
    dist = normalize(dist);
  }

  // 8. Controlled jitter — small per-mood multiplicative noise so two
  // similar frames don't yield identical distributions.
  for (const k of Object.keys(dist) as MoodKey[]) {
    const jitter = 1 + (Math.random() - 0.5) * 2 * NOISE_STRENGTH;
    dist[k] = Math.max(0, dist[k] * jitter);
  }
  dist = normalize(dist);

  // 9. Sample primary + rank secondaries.
  const ranked = (Object.keys(dist) as MoodKey[])
    .map(k => ({ mood: k, probability: dist[k] }))
    .sort((a, b) => b.probability - a.probability);
  const top = ranked[0];
  const second = ranked[1];

  // Detect uncertainty: low top probability OR top-2 too close.
  const uncertain =
    top.probability < UNCERTAIN_TOP_THRESHOLD ||
    (second && top.probability - second.probability < UNCERTAIN_GAP_THRESHOLD);

  // When uncertain we still need a primary to display, but we sample from
  // the top 3 weighted — we never silently coerce to neutral / stressed.
  let primary: MoodKey;
  if (uncertain) {
    const top3 = ranked.slice(0, 3);
    const sumTop = top3.reduce((s, x) => s + x.probability, 0);
    const subDist = {} as Record<MoodKey, number>;
    for (const k of MOODS.map(m => m.key)) subDist[k] = 0;
    for (const x of top3) subDist[x.mood] = x.probability / sumTop;
    primary = sampleFrom(subDist);
  } else {
    primary = sampleFrom(dist);
  }

  const confidence = dist[primary];
  const secondary: MoodProbability[] = ranked
    .filter(x => x.mood !== primary)
    .slice(0, 2);

  // 10. Update session + recent state.
  counts[primary] = (counts[primary] ?? 0) + 1;
  saveSession(counts);
  pushRecent(primary);

  const explanation = explain(
    primary,
    uncertain,
    { brightness, warmth, variance },
    behReasons,
  );

  return {
    mood: primary,
    confidence,
    uncertain,
    secondary,
    distribution: dist,
    explanation,
  };
};
