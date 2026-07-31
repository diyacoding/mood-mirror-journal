import confetti from "canvas-confetti";

export type CelebrationKind =
  | "first-mood"
  | "hatch"
  | "pet-saved"
  | "accessory"
  | "new-pet"
  | "achievement"
  | "streak-7"
  | "streak-30";

const reduceMotion = () =>
  typeof document !== "undefined" &&
  (document.documentElement.classList.contains("pref-reduce-motion") ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const PURPLES = ["#a855f7", "#c084fc", "#e9d5ff", "#f0abfc", "#7c3aed"];

/** Tasteful confetti burst. Silently no-ops when Reduce Motion is enabled. */
export function celebrate(kind: CelebrationKind = "achievement") {
  if (typeof window === "undefined") return;
  if (reduceMotion()) return;

  const big = kind === "new-pet" || kind === "streak-30" || kind === "hatch";
  const base = {
    colors: PURPLES,
    disableForReducedMotion: true,
    scalar: 0.9,
    zIndex: 100,
  } as const;

  confetti({
    ...base,
    particleCount: big ? 90 : 55,
    spread: big ? 90 : 65,
    startVelocity: big ? 45 : 35,
    origin: { y: 0.7 },
  });

  if (big) {
    setTimeout(() => {
      confetti({ ...base, particleCount: 50, angle: 60, spread: 70, origin: { x: 0, y: 0.75 } });
      confetti({ ...base, particleCount: 50, angle: 120, spread: 70, origin: { x: 1, y: 0.75 } });
    }, 220);
  }
}
