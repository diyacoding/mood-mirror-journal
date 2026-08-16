import { useCallback, useEffect, useSyncExternalStore } from "react";
import { applyThemeHues } from "@/lib/themeHue";

export type StickerSet = "classic" | "pastel" | "cosmic" | "minimal";

export interface Preferences {
  largerText: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  stickerSet: StickerSet;
  reminders: boolean;
  reminderTime: string;
  /** Hue id for the light-mode palette ("default" = original lavender). */
  lightHue: string;
  /** Hue id for the dark-mode palette ("default" = original dark purple). */
  darkHue: string;
}

const KEY = "mm.preferences";

export const STICKER_SETS: { id: StickerSet; label: string; preview: string[] }[] = [
  { id: "classic", label: "Classic", preview: ["😊", "😌", "😐", "😰", "😣", "😔"] },
  { id: "pastel", label: "Pastel Hearts", preview: ["💛", "💙", "🤍", "💜", "🧡", "💗"] },
  { id: "cosmic", label: "Cosmic", preview: ["🌞", "🌙", "⭐", "☄️", "🌩️", "🌧️"] },
  { id: "minimal", label: "Minimal", preview: ["●", "◐", "○", "◔", "◍", "◌"] },
];

const DEFAULTS: Preferences = {
  largerText: false,
  reduceMotion: false,
  highContrast: false,
  stickerSet: "classic",
  reminders: false,
  reminderTime: "21:00",
  lightHue: "default",
  darkHue: "default",
};

function read(): Preferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    const legacy: Partial<Preferences> = {
      reminders: window.localStorage.getItem("mm.reminders") === "1",
      reminderTime: window.localStorage.getItem("mm.reminderTime") ?? undefined,
    };
    const parsed = raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
    return { ...DEFAULTS, ...legacy, ...parsed } as Preferences;
  } catch {
    return DEFAULTS;
  }
}

let cache: Preferences = read();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function applyPreferences(p: Preferences) {
  const root = document.documentElement;
  root.classList.toggle("pref-large-text", p.largerText);
  root.classList.toggle("pref-reduce-motion", p.reduceMotion);
  root.classList.toggle("pref-high-contrast", p.highContrast);
  applyThemeHues(p.lightHue, p.darkHue);
}

export function getInitialPreferences(): Preferences {
  return cache;
}

export function setPreferences(patch: Partial<Preferences>) {
  cache = { ...cache, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
  applyPreferences(cache);
  listeners.forEach((l) => l());
}

export function usePreferences() {
  const prefs = useSyncExternalStore(subscribe, () => cache, () => cache);

  useEffect(() => {
    applyPreferences(prefs);
  }, [prefs]);

  const update = useCallback((patch: Partial<Preferences>) => setPreferences(patch), []);

  return { prefs, update };
}
