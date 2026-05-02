// Lightweight on-device "facial mood" simulation.
// Instead of returning a single hard-coded pick, we build a probability
// distribution over moods weighted by visual signals (brightness, warmth,
// texture variance) and sample from it. User corrections are persisted and
// nudge future predictions via a learned bias vector. Frames never leave the
// device.
import { MOODS, type MoodKey } from "./moodStore";

export interface DetectionResult {
  mood: MoodKey;
  confidence: number; // 0-1, probability of the sampled mood
  distribution: Record<MoodKey, number>; // sums to ~1
}

const FEEDBACK_KEY = "moodmirror.face.feedback.v1";
// Smoothing & learning rates
const TEMPERATURE = 0.65; // <1 sharpens, >1 flattens
const FEEDBACK_STRENGTH = 0.35; // how much correction history nudges priors
const PRIOR = 0.05; // floor so every mood keeps some probability

type Bias = Record<MoodKey, number>;

const emptyBias = (): Bias =>
  MOODS.reduce((acc, m) => { acc[m.key] = 0; return acc; }, {} as Bias);

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

/**
 * Record user feedback. When the user confirms or overrides a suggestion,
 * the chosen mood gets reinforced and the suggested-but-rejected mood gets
 * gently down-weighted. Bias is decayed each call to stay adaptive.
 */
export const recordFeedback = (suggested: MoodKey, chosen: MoodKey) => {
  const bias = loadBias();
  // Decay so old corrections don't dominate forever
  for (const k of Object.keys(bias) as MoodKey[]) bias[k] *= 0.92;

  bias[chosen] = (bias[chosen] ?? 0) + 1;
  if (suggested !== chosen) {
    bias[suggested] = (bias[suggested] ?? 0) - 0.5;
  }
  saveBias(bias);
};

const softmax = (scores: Record<MoodKey, number>, temp = 1): Record<MoodKey, number> => {
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

const sampleFrom = (dist: Record<MoodKey, number>): MoodKey => {
  const r = Math.random();
  let cum = 0;
  for (const k of Object.keys(dist) as MoodKey[]) {
    cum += dist[k];
    if (r <= cum) return k;
  }
  return (Object.keys(dist) as MoodKey[])[0];
};

/**
 * Score each mood given visual signals. Higher = more compatible with the
 * frame. These are intentionally smooth (no hard if/else cliffs) so the
 * resulting distribution reflects ambiguity in the signal.
 */
const scoreFromSignals = (
  brightness: number, // 0-1
  warmth: number,    // -1..1
  variance: number,  // ~0..1
): Record<MoodKey, number> => {
  return {
    happy:    2.2 * (brightness - 0.5) + 1.8 * warmth - 0.6 * variance,
    calm:     1.6 * (brightness - 0.45) - 1.4 * variance + 0.3 * (0.05 - Math.abs(warmth)),
    neutral:  0.8 - 1.2 * Math.abs(brightness - 0.5) - 1.0 * Math.abs(warmth) - 0.8 * variance,
    anxious:  1.6 * variance - 0.8 * (brightness - 0.4) + 0.4 * Math.abs(warmth),
    stressed: 1.8 * variance + 1.2 * Math.max(0, warmth) - 0.6 * (brightness - 0.4),
    sad:     -2.0 * (brightness - 0.4) - 1.2 * Math.max(0, warmth) - 0.4 * variance,
  };
};

export const detectMoodFromVideo = (video: HTMLVideoElement): DetectionResult => {
  const canvas = document.createElement("canvas");
  const w = (canvas.width = 64);
  const h = (canvas.height = 64);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let r = 0, g = 0, b = 0, total = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]; total++;
  }
  r /= total; g /= total; b /= total;

  const brightness = (r + g + b) / 3 / 255;
  const warmth = (r - b) / 255;
  const variance = sampleVariance(data) / 255;

  // 1. Signal-driven scores
  const scores = scoreFromSignals(brightness, warmth, variance);

  // 2. Add learned bias from user feedback history
  const bias = loadBias();
  for (const k of Object.keys(scores) as MoodKey[]) {
    scores[k] += FEEDBACK_STRENGTH * (bias[k] ?? 0);
  }

  // 3. Softmax → probability distribution, with prior floor
  let dist = softmax(scores, TEMPERATURE);
  let s = 0;
  for (const k of Object.keys(dist) as MoodKey[]) {
    dist[k] = dist[k] + PRIOR;
    s += dist[k];
  }
  for (const k of Object.keys(dist) as MoodKey[]) dist[k] /= s;

  // 4. Sample from the distribution (random, weighted) instead of argmax
  const mood = sampleFrom(dist);
  const confidence = dist[mood];

  return { mood, confidence, distribution: dist };
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
