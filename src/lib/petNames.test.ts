import { describe, expect, it } from "vitest";
import { displayPetName, validatePetName } from "./petNames";

describe("pet names", () => {
  it("requires a non-empty name after trimming", () => {
    expect(validatePetName("   ")).not.toBeNull();
  });
  it("allows letters, numbers, spaces and emoji up to 20 characters", () => {
    expect(validatePetName("Mochi 2 💗")).toBeNull();
    expect(validatePetName("a".repeat(20))).toBeNull();
  });
  it("rejects names longer than 20 characters", () => {
    expect(validatePetName("a".repeat(21))).not.toBeNull();
  });
  it("shows My Pet for unnamed or old default Lumi pets", () => {
    expect(displayPetName(undefined)).toBe("My Pet");
    expect(displayPetName("Lumi")).toBe("My Pet");
    expect(displayPetName("Biscuit")).toBe("Biscuit");
  });
});
