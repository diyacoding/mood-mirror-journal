import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string } | null },
  callback: null as ((user: { uid: string } | null) => void) | null,
  moods: new Map<string, (entries: unknown[]) => void>(),
  connections: new Map<string, (connection: unknown) => void>(),
  owners: new Map<string, (owner: unknown) => void>(),
  items: new Map<string, (items: unknown[]) => void>(),
}));
vi.mock("./firebase", () => ({ auth: mocks.auth }));
vi.mock("firebase/auth", () => ({ onAuthStateChanged: (_: unknown, cb: typeof mocks.callback) => { mocks.callback = cb; } }));
vi.mock("./audioEngine", () => ({ setAudioSettings: vi.fn() }));
vi.mock("./themeHue", () => ({ applyThemeHues: vi.fn() }));
vi.mock("./moodApi", () => ({ subscribeMoodEntries: (uid: string, cb: (list: unknown[]) => void) => { mocks.moods.set(uid, cb); return () => {}; } }));
vi.mock("./connectionsApi", () => ({ subscribeMyConnection: (uid: string, cb: (c: unknown) => void) => { mocks.connections.set(uid, cb); return () => {}; } }));
vi.mock("./petApi", () => ({
  personalKey: (uid: string) => `u_${uid}`, sharedKey: (id: string) => `c_${id}`,
  subscribeOwnerForUser: (uid: string, cb: (owner: unknown) => void) => { mocks.owners.set(uid, cb); return () => {}; },
  subscribePetItems: (id: string, cb: (items: unknown[]) => void) => { mocks.items.set(id, cb); return () => {}; },
}));
import { activateAccountPreferences, getInitialPreferences, setPreferences, usePreferences } from "@/hooks/usePreferences";
import { captureAccount, installAccountLifecycle } from "./accountSession";
import { useConnection } from "@/hooks/useConnection";
import { usePet } from "@/hooks/usePet";

function switchTo(uid: string | null) {
  act(() => {
    mocks.auth.currentUser = uid ? { uid } : null;
    mocks.callback?.(mocks.auth.currentUser);
  });
}
installAccountLifecycle(activateAccountPreferences);
beforeEach(() => { localStorage.clear(); switchTo(null); });

describe("Account isolation", () => {
  it("keeps A's theme and B's theme separately through switches and reloads", () => {
    switchTo("A"); setPreferences({ theme: "light", lightHue: "rose" });
    switchTo("B"); setPreferences({ theme: "dark", darkHue: "forest" });
    switchTo("A"); expect(getInitialPreferences()).toMatchObject({ theme: "light", lightHue: "rose" });
    activateAccountPreferences("A"); expect(getInitialPreferences().theme).toBe("light");
    switchTo("B"); expect(getInitialPreferences()).toMatchObject({ theme: "dark", darkHue: "forest" });
  });
  it("keeps different sticker selections associated with their own UID", () => {
    switchTo("A"); setPreferences({ stickerSet: "pastel" });
    switchTo("B"); expect(getInitialPreferences().stickerSet).toBe("classic"); setPreferences({ stickerSet: "cosmic" });
    switchTo("A"); expect(getInitialPreferences().stickerSet).toBe("pastel");
    switchTo("B"); expect(getInitialPreferences().stickerSet).toBe("cosmic");
  });
  it("preserves legacy settings without assigning them to either account", () => {
    const legacy = JSON.stringify({ stickerSet: "pastel", musicVolume: 0.65 });
    localStorage.setItem("mm.preferences", legacy); localStorage.setItem("mm.theme", "light");
    switchTo("A"); expect(getInitialPreferences()).toMatchObject({ theme: "dark", stickerSet: "classic" });
    switchTo("B"); expect(getInitialPreferences()).toMatchObject({ theme: "dark", stickerSet: "classic" });
    expect(localStorage.getItem("mm.preferences")).toBe(legacy); expect(localStorage.getItem("mm.theme")).toBe("light");
  });
  it("prevents a delayed A preference handler from changing B or a later A session", () => {
    switchTo("A"); const hook = renderHook(() => usePreferences()); const updateA = hook.result.current.update;
    switchTo("B"); act(() => updateA({ stickerSet: "pastel" })); expect(getInitialPreferences().stickerSet).toBe("classic");
    switchTo("A"); act(() => updateA({ theme: "light" })); expect(getInitialPreferences().theme).toBe("dark"); hook.unmount();
  });
  it("invalidates pending operations through rapid A -> B -> A changes", () => {
    switchTo("A"); const current = captureAccount("A"); expect(current()).toBe(true);
    switchTo("B"); expect(current()).toBe(false); switchTo("A"); expect(current()).toBe(false);
  });
  it("does not display an old connection while B's connection loads", () => {
    switchTo("A"); const h = renderHook(({ uid }) => useConnection(uid), { initialProps: { uid: "A" } });
    act(() => mocks.connections.get("A")?.({ id: "sharedA", status: "active" })); expect(h.result.current.connection?.id).toBe("sharedA");
    switchTo("B"); h.rerender({ uid: "B" }); expect(h.result.current.connection).toBeNull(); expect(h.result.current.loading).toBe(true);
    act(() => mocks.connections.get("A")?.({ id: "lateA", status: "active" })); expect(h.result.current.connection).toBeNull(); h.unmount();
  });
  it("keeps pets, names, points and late snapshots in their authorized owner scope", async () => {
    switchTo("A"); const h = renderHook(({ uid }) => usePet(uid), { initialProps: { uid: "A" } });
    act(() => mocks.connections.get("A")?.(null));
    act(() => mocks.owners.get("A")?.({ id: "u_A", ownerType: "user", ownerId: "A", members: ["A"], points: 10, currentPetId: "petA" }));
    act(() => mocks.items.get("u_A")?.([{ id: "petA", name: "Mochi", accessories: [] }])); expect(h.result.current.currentPet?.name).toBe("Mochi");
    switchTo("B"); h.rerender({ uid: "B" }); expect(h.result.current.owner).toBeNull(); expect(h.result.current.items).toEqual([]);
    act(() => mocks.connections.get("B")?.(null));
    act(() => mocks.owners.get("A")?.({ id: "u_A", members: ["A"], points: 1000 })); expect(h.result.current.owner).toBeNull();
    act(() => mocks.owners.get("B")?.({ id: "u_B", ownerType: "user", ownerId: "B", members: ["B"], points: 20, currentPetId: "petB" }));
    act(() => mocks.items.get("u_B")?.([{ id: "petB", name: "Bunny", accessories: [] }]));
    await waitFor(() => expect(h.result.current.currentPet?.name).toBe("Bunny")); expect(h.result.current.owner?.points).toBe(20); h.unmount();
  });
  it("rejects an owner whose membership does not authorize the current account", () => {
    switchTo("B"); const h = renderHook(() => usePet("B")); act(() => mocks.connections.get("B")?.(null));
    act(() => mocks.owners.get("B")?.({ id: "u_A", ownerType: "user", ownerId: "A", members: ["A"] }));
    expect(h.result.current.owner).toBeNull(); expect(h.result.current.error).toContain("ownership"); h.unmount();
  });
});