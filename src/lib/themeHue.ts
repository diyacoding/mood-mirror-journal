// Theme hue customization — shifts the hue of the existing light/dark palettes.
// The default option emits no overrides at all, so untouched users see the
// exact same appearance as before.

export type HueId = string;

export interface HueOption {
  id: HueId;
  label: string;
  /** Target hue in degrees (base palette hue is 270 = purple). */
  hue: number;
  /** Saturation multiplier applied to every themed token. */
  sat?: number;
  /** Swatch color for the picker preview. */
  swatch: string;
}

/** Base hue of the shipped palette. */
const BASE_HUE = 270;

export const LIGHT_HUES: HueOption[] = [
  { id: "default", label: "Lavender (default)", hue: 270, swatch: "hsl(280 60% 88%)" },
  { id: "purple", label: "Purple", hue: 285, sat: 1.05, swatch: "hsl(290 65% 85%)" },
  { id: "pink", label: "Pink", hue: 330, swatch: "hsl(335 70% 88%)" },
  { id: "rose", label: "Warm rose", hue: 350, sat: 0.9, swatch: "hsl(352 65% 88%)" },
  { id: "blue", label: "Blue", hue: 220, swatch: "hsl(222 70% 87%)" },
  { id: "sky", label: "Sky", hue: 200, sat: 0.9, swatch: "hsl(200 70% 86%)" },
  { id: "mint", label: "Mint", hue: 165, sat: 0.8, swatch: "hsl(165 55% 85%)" },
  { id: "green", label: "Green", hue: 140, sat: 0.75, swatch: "hsl(140 45% 84%)" },
  { id: "peach", label: "Peach", hue: 25, sat: 0.9, swatch: "hsl(25 75% 87%)" },
  { id: "beige", label: "Warm beige", hue: 38, sat: 0.5, swatch: "hsl(38 45% 88%)" },
];

export const DARK_HUES: HueOption[] = [
  { id: "default", label: "Dark purple (default)", hue: 270, swatch: "hsl(270 96% 60%)" },
  { id: "lavender", label: "Dark lavender", hue: 285, sat: 0.85, swatch: "hsl(285 70% 55%)" },
  { id: "rose", label: "Dark rose", hue: 335, sat: 0.8, swatch: "hsl(335 70% 50%)" },
  { id: "blue", label: "Dark blue", hue: 225, sat: 0.9, swatch: "hsl(225 80% 52%)" },
  { id: "indigo", label: "Dark indigo", hue: 245, sat: 0.9, swatch: "hsl(245 80% 55%)" },
  { id: "teal", label: "Dark teal", hue: 185, sat: 0.8, swatch: "hsl(185 70% 42%)" },
  { id: "green", label: "Dark green", hue: 150, sat: 0.7, swatch: "hsl(150 55% 40%)" },
  { id: "amber", label: "Dark amber", hue: 35, sat: 0.7, swatch: "hsl(35 70% 48%)" },
];

/**
 * Themed token values, mirrored from index.css. Mood colors, destructive and
 * pure neutrals are intentionally left out so mood semantics never shift.
 */
const DARK_TOKENS: Record<string, string> = {
  "--background": "268 100% 6%",
  "--foreground": "270 100% 92%",
  "--card": "270 60% 10%",
  "--card-foreground": "270 100% 94%",
  "--popover": "270 60% 9%",
  "--popover-foreground": "270 100% 94%",
  "--primary": "264 100% 59%",
  "--primary-glow": "270 96% 75%",
  "--secondary": "270 50% 18%",
  "--secondary-foreground": "270 100% 92%",
  "--muted": "270 40% 14%",
  "--muted-foreground": "270 35% 70%",
  "--accent": "270 96% 75%",
  "--accent-foreground": "270 60% 12%",
  "--border": "270 60% 22%",
  "--input": "270 50% 16%",
  "--ring": "264 100% 59%",
  "--gradient-primary": "linear-gradient(135deg, hsl(264 100% 59%), hsl(285 100% 70%))",
  "--gradient-aurora":
    "linear-gradient(135deg, hsl(268 100% 6%) 0%, hsl(270 80% 14%) 50%, hsl(285 70% 22%) 100%)",
  "--gradient-soft":
    "radial-gradient(ellipse at top, hsl(270 80% 18% / 0.9), hsl(268 100% 6%) 70%)",
  "--gradient-glow": "radial-gradient(circle at center, hsl(270 96% 75% / 0.35), transparent 70%)",
  "--gradient-sky": "linear-gradient(135deg, hsl(264 100% 59%), hsl(290 100% 72%))",
  "--gradient-dawn": "linear-gradient(135deg, hsl(268 100% 6%), hsl(285 70% 18%))",
  "--gradient-meadow": "linear-gradient(135deg, hsl(285 70% 22%), hsl(270 60% 18%))",
  "--shadow-soft": "0 8px 40px -12px hsl(270 100% 50% / 0.35)",
  "--shadow-glow": "0 0 40px hsl(270 96% 65% / 0.55), 0 0 80px hsl(264 100% 59% / 0.25)",
  "--shadow-card": "0 10px 40px -10px hsl(270 100% 30% / 0.45)",
  "--sidebar-background": "270 60% 8%",
  "--sidebar-foreground": "270 80% 90%",
  "--sidebar-primary": "264 100% 59%",
  "--sidebar-accent": "270 50% 16%",
  "--sidebar-accent-foreground": "270 100% 92%",
  "--sidebar-border": "270 60% 22%",
  "--sidebar-ring": "264 100% 59%",
};

const LIGHT_TOKENS: Record<string, string> = {
  "--background": "280 60% 96%",
  "--foreground": "270 60% 18%",
  "--card": "285 70% 99%",
  "--card-foreground": "270 55% 20%",
  "--popover": "285 70% 99%",
  "--popover-foreground": "270 55% 20%",
  "--primary": "264 85% 55%",
  "--primary-glow": "270 90% 68%",
  "--secondary": "275 55% 92%",
  "--secondary-foreground": "270 55% 22%",
  "--muted": "275 45% 92%",
  "--muted-foreground": "270 25% 40%",
  "--accent": "268 75% 50%",
  "--border": "275 45% 82%",
  "--input": "275 45% 90%",
  "--ring": "264 85% 55%",
  "--gradient-primary": "linear-gradient(135deg, hsl(264 85% 55%), hsl(285 85% 68%))",
  "--gradient-aurora":
    "linear-gradient(135deg, hsl(280 70% 95%) 0%, hsl(275 75% 90%) 50%, hsl(270 65% 85%) 100%)",
  "--gradient-soft":
    "radial-gradient(ellipse at top, hsl(280 80% 98% / 0.95), hsl(275 65% 92%) 70%)",
  "--gradient-glow": "radial-gradient(circle at center, hsl(270 90% 68% / 0.28), transparent 70%)",
  "--gradient-sky": "linear-gradient(135deg, hsl(264 85% 60%), hsl(290 90% 72%))",
  "--gradient-dawn": "linear-gradient(135deg, hsl(280 70% 95%), hsl(275 70% 88%))",
  "--gradient-meadow": "linear-gradient(135deg, hsl(285 60% 90%), hsl(270 55% 88%))",
  "--shadow-soft": "0 8px 40px -12px hsl(270 60% 40% / 0.18)",
  "--shadow-glow": "0 0 40px hsl(270 90% 68% / 0.35), 0 0 80px hsl(264 85% 55% / 0.15)",
  "--shadow-card": "0 10px 30px -12px hsl(270 60% 40% / 0.22)",
  "--sidebar-background": "280 60% 96%",
  "--sidebar-foreground": "270 55% 22%",
  "--sidebar-primary": "264 85% 55%",
  "--sidebar-accent": "275 55% 90%",
  "--sidebar-accent-foreground": "270 55% 22%",
  "--sidebar-border": "275 45% 82%",
  "--sidebar-ring": "264 85% 55%",
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Shift an "H S% L%" triple. */
function shiftTriple(triple: string, delta: number, sat: number): string {
  const m = triple.trim().match(/^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%(.*)$/);
  if (!m) return triple;
  const h = ((parseFloat(m[1]) + delta) % 360 + 360) % 360;
  const s = clamp(parseFloat(m[2]) * sat, 0, 100);
  return `${h.toFixed(1)} ${s.toFixed(1)}% ${m[3]}%${m[4] ?? ""}`;
}

/** Shift every hsl(...) inside a gradient/shadow value. */
function shiftValue(value: string, delta: number, sat: number): string {
  if (!value.includes("hsl(")) return shiftTriple(value, delta, sat);
  return value.replace(/hsl\(([^)]+)\)/g, (_all, inner: string) => `hsl(${shiftTriple(inner, delta, sat)})`);
}

function block(selector: string, tokens: Record<string, string>, opt: HueOption): string {
  const delta = opt.hue - BASE_HUE;
  const sat = opt.sat ?? 1;
  const lines = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${shiftValue(v, delta, sat)};`)
    .join("\n");
  return `${selector} {\n${lines}\n}`;
}

const STYLE_ID = "mm-theme-hue";

export const findHue = (list: HueOption[], id: HueId | undefined) =>
  list.find((h) => h.id === id) ?? list[0];

/** Inject (or clear) hue overrides for both modes. */
export function applyThemeHues(lightId: HueId = "default", darkId: HueId = "default") {
  if (typeof document === "undefined") return;
  const light = findHue(LIGHT_HUES, lightId);
  const dark = findHue(DARK_HUES, darkId);

  const parts: string[] = [];
  if (dark.id !== "default") parts.push(block("html:not(.light)", DARK_TOKENS, dark));
  if (light.id !== "default") parts.push(block("html.light", LIGHT_TOKENS, light));

  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!parts.length) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = parts.join("\n");
}
