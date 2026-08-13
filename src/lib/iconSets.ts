// Global icon-style system.
// A single source of truth so that every emoji-style icon in the app follows the
// icon style selected in Settings ("Sticker set").

import { usePreferences, type StickerSet } from "@/hooks/usePreferences";
import type { MoodKey } from "./moodTypes";
import type { AccessoryKey } from "./petTypes";

type MoodMap = Record<MoodKey, string>;
type AccessoryMap = Record<AccessoryKey, string>;
type MiscKey =
  | "egg"
  | "hatching"
  | "gift"
  | "spark"
  | "heart"
  | "star"
  | "party"
  | "palette";
type MiscMap = Record<MiscKey, string>;

interface IconSet {
  moods: MoodMap;
  accessories: AccessoryMap;
  misc: MiscMap;
}

const SETS: Record<StickerSet, IconSet> = {
  classic: {
    moods: {
      happy: "😊", calm: "😌", neutral: "😐",
      anxious: "😰", stressed: "😣", sad: "😔",
    },
    accessories: {
      flower: "🌸", hat: "🎩", bow: "🎀", "cat-ears": "🐱", dress: "👗",
      wings: "🦋", glasses: "🕶️", scarf: "🧣", crown: "👑", custom: "🖌️",
    },
    misc: {
      egg: "🥚", hatching: "🐣", gift: "🎁", spark: "✨",
      heart: "💜", star: "⭐", party: "🎉", palette: "🎨",
    },
  },
  pastel: {
    moods: {
      happy: "💛", calm: "💙", neutral: "🤍",
      anxious: "💜", stressed: "🧡", sad: "💗",
    },
    accessories: {
      flower: "🌷", hat: "👒", bow: "🎀", "cat-ears": "🐰", dress: "👚",
      wings: "🕊️", glasses: "👓", scarf: "🧶", crown: "🫧", custom: "🖌️",
    },
    misc: {
      egg: "🤍", hatching: "🐤", gift: "🎀", spark: "🌸",
      heart: "💗", star: "🤍", party: "🎊", palette: "🖌️",
    },
  },
  cosmic: {
    moods: {
      happy: "🌞", calm: "🌙", neutral: "⭐",
      anxious: "☄️", stressed: "🌩️", sad: "🌧️",
    },
    accessories: {
      flower: "💫", hat: "🪐", bow: "✨", "cat-ears": "🌙", dress: "🌌",
      wings: "🚀", glasses: "🔭", scarf: "☄️", crown: "👑", custom: "🖌️",
    },
    misc: {
      egg: "🌑", hatching: "🌓", gift: "🌠", spark: "✨",
      heart: "💫", star: "🌟", party: "🎆", palette: "🖌️",
    },
  },
  minimal: {
    moods: {
      happy: "●", calm: "◐", neutral: "○",
      anxious: "◔", stressed: "◍", sad: "◌",
    },
    accessories: {
      flower: "✽", hat: "⌂", bow: "✕", "cat-ears": "⌃", dress: "▽",
      wings: "⌇", glasses: "⊙", scarf: "≈", crown: "♛", custom: "✎",
    },
    misc: {
      egg: "◯", hatching: "◍", gift: "◈", spark: "✦",
      heart: "♥", star: "✧", party: "✺", palette: "✎",
    },
  },
};

export const getIconSet = (set: StickerSet): IconSet => SETS[set] ?? SETS.classic;

export const moodIcon = (set: StickerSet, mood: MoodKey) =>
  getIconSet(set).moods[mood] ?? SETS.classic.moods[mood];

export const accessoryIcon = (set: StickerSet, key: AccessoryKey) =>
  getIconSet(set).accessories[key] ?? SETS.classic.accessories[key];

export const miscIcon = (set: StickerSet, key: MiscKey) =>
  getIconSet(set).misc[key] ?? SETS.classic.misc[key];

/** Reactive access to the selected icon style — updates instantly on change. */
export function useIcons() {
  const { prefs } = usePreferences();
  const set = prefs.stickerSet;
  return {
    set,
    mood: (m: MoodKey) => moodIcon(set, m),
    accessory: (a: AccessoryKey) => accessoryIcon(set, a),
    misc: (k: MiscKey) => miscIcon(set, k),
  };
}
