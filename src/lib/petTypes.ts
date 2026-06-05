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

export interface PetItem {
  id: string;
  name?: string;
  imageDataUrl: string;
  accessories: AccessoryKey[];
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
  inventoryByUser: Record<string, AccessoryKey[]>;
  milestone50: number;   // last 50-multiple awarded
  milestone100: number;  // last 100-multiple awarded
}
