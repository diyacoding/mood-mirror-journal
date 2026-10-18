export const PET_NAME_MAX = 20;
export const PET_NAME_FALLBACK = "My Pet";

/** Counts user-visible characters (so an emoji counts as one). */
export const petNameLength = (name: string) => Array.from(name).length;

/** Returns an error message, or null when the name is valid. */
export function validatePetName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "Please give your pet a name.";
  if (petNameLength(name) > PET_NAME_MAX) return `Names can be up to ${PET_NAME_MAX} characters.`;
  // Letters, numbers, spaces, emoji and light punctuation only.
  if (!/^[\p{L}\p{N}\p{M}\p{Extended_Pictographic}\u200d\ufe0f '\-.!]+$/u.test(name)) {
    return "Use letters, numbers, spaces or emoji.";
  }
  return null;
}

/** Display name for a pet; old pets saved as "Lumi" by default show the fallback. */
export function displayPetName(name?: string | null): string {
  const n = name?.trim();
  if (!n || n === "Lumi") return PET_NAME_FALLBACK;
  return n;
}
