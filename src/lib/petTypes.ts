// Pet Growth — types

export type AccessoryKey =
  | "flower"
  | "hat"
  | "bow"
  | "cat-ears"
  | "dress"
  | "wings"
  | "glasses"
  | "scarf"
  | "crown"
  | "custom";

export interface AccessoryMeta {
  key: AccessoryKey;
  label: string;
  emoji: string;
  position: "top" | "face" | "body" | "side";
}

export const ACCESSORIES: AccessoryMeta[] = [
  { key: "flower",   label: "Flower",   emoji: "🌸", position: "top"  },
  { key: "hat",      label: "Hat",      emoji: "🎩", position: "top"  },
  { key: "bow",      label: "Bow",      emoji: "🎀", position: "top"  },
  { key: "cat-ears", label: "Cat Ears", emoji: "🐱", position: "top"  },
  { key: "dress",    label: "Dress",    emoji: "👗", position: "body" },
  { key: "wings",    label: "Wings",    emoji: "🦋", position: "side" },
  { key: "glasses",  label: "Glasses",  emoji: "🕶️", position: "face" },
  { key: "scarf",    label: "Scarf",    emoji: "🧣", position: "body" },
  { key: "crown",    label: "Crown",    emoji: "👑", position: "top"  },
  { key: "custom",   label: "Draw Your Own", emoji: "🎨", position: "side" },
];

export const accessoryMeta = (k: AccessoryKey) =>
  ACCESSORIES.find((a) => a.key === k) ?? ACCESSORIES[0];

/** Accessory identifier: a built-in key, or `custom:<id>` for a user drawing. */
export type AccessoryId = AccessoryKey | string;

export const isCustomAccessory = (id: AccessoryId) => id.startsWith("custom:");

export interface CustomAccessory {
  id: string;              // `custom:<timestamp>`
  imageDataUrl: string;    // the user's drawing, preserved as-is
  createdAt: number;
}

export interface AccessoryPlacement {
  x: number; // 0-100 percent of pet box width
  y: number; // 0-100 percent of pet box height
}

export interface PetItem {
  id: string;
  name?: string;
  imageDataUrl: string;
  accessories: AccessoryId[];
  /** Saved drag positions per accessory id (percent of the pet box). */
  accessoryPositions?: Record<string, AccessoryPlacement>;
  createdAt: number;
  createdBy: string;
}

export interface PetOwnerDoc {
  id: string;            // ownerKey: "u_{uid}" or "c_{cid}"
  ownerType: "user" | "connection";
  ownerId: string;       // uid or connectionId
  members: string[];     // uids allowed
  points: number;
  currentPetId: string | null;
  pendingNewPet: boolean;
  spinsByUser: Record<string, number>;   // pending spins per uid
  inventoryByUser: Record<string, AccessoryId[]>;
  /** User-drawn accessories, keyed by uid. */
  customAccessoriesByUser?: Record<string, CustomAccessory[]>;
  milestone50: number;   // last 50-multiple awarded
  milestone100: number;  // last 100-multiple awarded
}
