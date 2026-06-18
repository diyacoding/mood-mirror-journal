import { useEffect, useRef, useState } from "react";
import { User } from "firebase/auth";
import { toast } from "sonner";
import { Sparkles, Gift, Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePet } from "@/hooks/usePet";
import {
  applyAccessory,
  consumeSpin,
  createPet,
  removeAccessory,
  selectPet,
  addCustomAccessoryToInventory,
} from "@/lib/petApi";
import { accessoryMeta } from "@/lib/petTypes";
import type { AccessoryKey } from "@/lib/petTypes";
import { PetDisplay } from "@/components/pet/PetDisplay";
import { PetDrawingCanvas } from "@/components/pet/PetDrawingCanvas";
import { AccessoryWheel } from "@/components/pet/AccessoryWheel";
import { EggHatch } from "@/components/pet/EggHatch";
import { cn } from "@/lib/utils";

interface Props {
  user: User;
}

export const PetScreen = ({ user }: Props) => {
  const { owner, items, currentPet, loading } = usePet(user.uid);
  const [creator, setCreator] = useState(false);
  const [customAccessory, setCustomAccessory] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);

  const points = owner?.points ?? 0;
  const level = Math.floor(points / 100) + 1;
  const toNextPet = 100 - (points % 100);
  const toNextSpin = 50 - (points % 50);
  const mySpins = owner?.spinsByUser?.[user.uid] ?? 0;
  const inventory: AccessoryKey[] = owner?.inventoryByUser?.[user.uid] ?? [];
  const needsNew = owner?.pendingNewPet && !currentPet;
  const noPetYet = !currentPet && !loading;
  const shared = owner?.ownerType === "connection";

  const handleCreate = async (dataUrl: string) => {
    try {
      await createPet(user.uid, dataUrl);
      toast.success(shared ? "Pet hatched ✨ shared with your partner" : "Pet hatched ✨");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save pet");
    }
  };

  const handleSpin = async () => {
    const reward = await consumeSpin(user.uid);
    if (reward) toast.success(`Earned ${accessoryMeta(reward).label}!`);
    return reward;
  };

  const toggle = async (a: AccessoryKey) => {
    if (!currentPet) return;
    const on = currentPet.accessories.includes(a);
    if (on) await removeAccessory(user.uid, a);
    else await applyAccessory(user.uid, a);
  };

  const handleCustomAccessory = async (dataUrl: string) => {
    // Stored in inventory as the generic "custom" key; the drawn art lives implicitly per-user.
    // For now we simply add the slot — full custom art slots can be expanded later.
    await addCustomAccessoryToInventory(user.uid);
    toast.success("Custom accessory added");
  };

  return (
    <div className="px-5 pt-10 pb-32 space-y-6 animate-fade-in relative">
      <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full gradient-glow blur-3xl pointer-events-none" />

      <header>
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">
          {shared ? "Shared with your partner" : "Your companion"}
        </p>
        <h1 className="font-display text-2xl mt-1 text-glow tracking-widest">Pet Garden</h1>
      </header>

      {/* Hero pet */}
      <div className="relative glass-strong rounded-3xl p-6 shadow-glow flex flex-col items-center gap-4">
        <PetDisplay pet={currentPet} level={level} />
        <div className="text-center">
          <p className="font-display text-lg tracking-wider">
            {currentPet?.name ?? "Unhatched"}
          </p>
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent/80">
            Level {level} · {points} pts
          </p>
        </div>

        {/* Progress bars */}
        <div className="w-full space-y-2">
          <div>
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              <span>Next spin</span><span>{toNextSpin} pts</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full gradient-primary" style={{ width: `${((50 - toNextSpin) / 50) * 100}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              <span>Next pet</span><span>{toNextPet} pts</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full gradient-primary" style={{ width: `${((100 - toNextPet) / 100) * 100}%` }} />
            </div>
          </div>
        </div>

        {(noPetYet || needsNew) && (
          <Button
            onClick={() => setCreator(true)}
            className="w-full rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-12"
          >
            <Plus className="h-4 w-4 mr-1" />
            {needsNew ? "Design new pet (milestone!)" : "Create your pet"}
          </Button>
        )}
      </div>

      {/* Rewards */}
      <div className="glass rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-accent" />
            <h3 className="text-[11px] uppercase tracking-[0.25em]">Rewards</h3>
          </div>
          <span className="text-xs text-accent">{mySpins} spin{mySpins === 1 ? "" : "s"}</span>
        </div>
        <Button
          onClick={() => setWheelOpen(true)}
          disabled={mySpins <= 0}
          className="w-full rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-11"
        >
          <Sparkles className="h-4 w-4 mr-1" /> {mySpins > 0 ? "Spin the wheel" : "Log more moods"}
        </Button>
      </div>

      {/* Inventory + apply */}
      {inventory.length > 0 && currentPet && (
        <div className="glass rounded-3xl p-5 space-y-3">
          <h3 className="text-[11px] uppercase tracking-[0.25em] text-accent/80">Your accessories</h3>
          <div className="flex flex-wrap gap-2">
            {inventory.map((a) => {
              const meta = accessoryMeta(a);
              const on = currentPet.accessories.includes(a);
              return (
                <button
                  key={a}
                  onClick={() => toggle(a)}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm glass flex items-center gap-1.5 transition-smooth",
                    on ? "ring-glow border-accent/60" : "hover:scale-105",
                  )}
                >
                  <span className="text-lg">{meta.emoji}</span>
                  {meta.label}
                </button>
              );
            })}
            <button
              onClick={() => setCustomAccessory(true)}
              className="rounded-full px-3 py-2 text-sm glass flex items-center gap-1.5 hover:scale-105"
            >
              <Wand2 className="h-4 w-4" /> Draw your own
            </button>
          </div>
        </div>
      )}

      {/* Gallery */}
      {items.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm tracking-[0.25em] uppercase">Gallery</h3>
            <span className="text-xs text-muted-foreground">{items.length} pet{items.length === 1 ? "" : "s"}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {items.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPet(user.uid, p.id)}
                className={cn(
                  "aspect-square rounded-2xl glass p-2 flex flex-col items-center justify-center transition-smooth",
                  p.id === owner?.currentPetId ? "ring-glow" : "hover:scale-105",
                )}
              >
                <img src={p.imageDataUrl} alt={p.name ?? "Pet"} className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </section>
      )}

      {creator && (
        <PetDrawingCanvas
          title={shared ? "Co-design your pet" : "Create your pet"}
          onSave={handleCreate}
          onClose={() => setCreator(false)}
        />
      )}
      {customAccessory && (
        <PetDrawingCanvas
          title="Draw your accessory"
          onSave={handleCustomAccessory}
          onClose={() => setCustomAccessory(false)}
        />
      )}
      {wheelOpen && (
        <AccessoryWheel
          spinsRemaining={mySpins}
          onSpin={handleSpin}
          onClose={() => setWheelOpen(false)}
        />
      )}
    </div>
  );
};
