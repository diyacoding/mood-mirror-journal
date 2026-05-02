// Lightweight on-device "facial mood" simulation.
// We don't ship a real ML model in v1 — instead we sample image brightness/warmth
// from the camera frame and map it to a plausible mood with a confidence score.
// User always confirms or overrides. Frames never leave the device.
import type { MoodKey } from "./moodStore";

export interface DetectionResult {
  mood: MoodKey;
  confidence: number; // 0-1
}

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

  const brightness = (r + g + b) / 3 / 255; // 0-1
  const warmth = (r - b) / 255; // -1..1
  const variance = sampleVariance(data) / 255; // texture proxy

  let mood: MoodKey = "neutral";
  if (brightness > 0.55 && warmth > 0.05) mood = "happy";
  else if (brightness > 0.45 && warmth >= -0.05 && variance < 0.25) mood = "calm";
  else if (brightness < 0.35) mood = "sad";
  else if (variance > 0.35 && warmth > 0.1) mood = "stressed";
  else if (variance > 0.3) mood = "anxious";
  else mood = "neutral";

  // Confidence: stronger when signals are decisive
  const confidence = Math.min(0.95, 0.55 + Math.abs(warmth) * 0.6 + Math.abs(brightness - 0.5) * 0.4);
  return { mood, confidence };
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
