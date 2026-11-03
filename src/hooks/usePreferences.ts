import { useCallback, useEffect, useSyncExternalStore } from "react";
import { applyThemeHues } from "@/lib/themeHue";
import { setAudioSettings } from "@/lib/audioEngine";
import { auth } from "@/lib/firebase";
import { captureAccount } from "@/lib/accountSession";

export type StickerSet = "classic" | "pastel" | "cosmic" | "minimal";

export interface Preferences {
  theme: "dark" | "light";
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
  /** Background music on/off. Off by default — never autoplay uninvited. */
  musicOn: boolean;
  /** Background music volume, 0–1. */
  musicVolume: number;
  /** Sound-effects volume (page flips, drawing), 0–1. */
  sfxVolume: number;
  /** Sound effects on/off (clicks, page flips, drawing). */
  sfxOn: boolean;
}

export const preferencesKey = (uid: string) => `mm.preferences.${uid}`;

export const STICKER_SETS: { id: StickerSet; label: string; preview: string[] }[] = [
  { id: "classic", label: "Classic", preview: ["😊", "😌", "😐", "😰", "😣", "😔"] },
  { id: "pastel", label: "Pastel Hearts", preview: ["💛", "💙", "🤍", "💜", "🧡", "💗"] },
  { id: "cosmic", label: "Cosmic", preview: ["🌞", "🌙", "⭐", "☄️", "🌩️", "🌧️"] },
  { id: "minimal", label: "Minimal", preview: ["●", "◐", "○", "◔", "◍", "◌"] },
];

const DEFAULTS: Preferences = {
  theme: "dark",
  largerText: false,
  reduceMotion: false,
  highContrast: false,
  stickerSet: "classic",
  reminders: false,
  reminderTime: "21:00",
  lightHue: "default",
  darkHue: "default",
  musicOn: false,
  musicVolume: 0.3,
  sfxVolume: 0.5,
  sfxOn: true,
};

function read(uid: string | null): Preferences {
  if (typeof window === "undefined") return DEFAULTS;
  if (!uid) return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(preferencesKey(uid));
    const parsed = raw ? (JSON.parse(raw) as Partial<Preferences>) : {};
    return { ...DEFAULTS, ...parsed } as Preferences;
  } catch {
    return DEFAULTS;
  }
}

let activeUid: string | null = null;
let cache: Preferences = read(null);
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function applyPreferences(p: Preferences) {
  const root = document.documentElement;
  root.classList.toggle("light", p.theme === "light");
  root.style.colorScheme = p.theme;
  root.classList.toggle("pref-large-text", p.largerText);
  root.classList.toggle("pref-reduce-motion", p.reduceMotion);
  root.classList.toggle("pref-high-contrast", p.highContrast);
  applyThemeHues(p.lightHue, p.darkHue);
  setAudioSettings({ musicOn: p.musicOn, musicVolume: p.musicVolume, sfxVolume: p.sfxVolume, sfxOn: p.sfxOn });
}

export function getInitialPreferences(): Preferences {
  return cache;
}

export function activateAccountPreferences(uid: string | null) {
  activeUid = uid;
  cache = read(uid);
  applyPreferences(cache);
  listeners.forEach((l) => l());
}

export function setPreferences(patch: Partial<Preferences>, expectedUid: string | null = activeUid) {
  if (!expectedUid || expectedUid !== activeUid || auth.currentUser?.uid !== expectedUid) return;
  cache = { ...cache, ...patch };
  try {
    localStorage.setItem(preferencesKey(expectedUid), JSON.stringify(cache));
  } catch {
    /* ignore */
  }
  applyPreferences(cache);
  listeners.forEach((l) => l());
}

export function usePreferences() {
  const uid = activeUid;
  const isCurrent = uid ? captureAccount(uid) : () => false;
  const prefs = useSyncExternalStore(subscribe, () => cache, () => cache);

  useEffect(() => {
    applyPreferences(prefs);
  }, [prefs]);

  const update = useCallback((patch: Partial<Preferences>) => {
    if (isCurrent()) setPreferences(patch, uid);
  }, [uid]);

  return { prefs, update };
}
