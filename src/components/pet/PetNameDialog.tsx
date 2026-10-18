import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PET_NAME_MAX, validatePetName } from "@/lib/petNames";

interface Props {
  onSave: (name: string) => void;
  onCancel: () => void;
}

/** Asks for a new pet's name right after it is drawn. */
export const PetNameDialog = ({ onSave, onCancel }: Props) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const err = validatePetName(value);
    if (err) return setError(err);
    onSave(value.trim());
  };
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="pet-name-title">
      <form
        className="glass-strong rounded-3xl p-5 w-full max-w-sm space-y-3"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <h2 id="pet-name-title" className="font-display text-lg text-center">
          What would you like to name your new friend? 💗
        </h2>
        <Input
          autoFocus
          aria-label="Pet name"
          value={value}
          maxLength={PET_NAME_MAX * 2}
          placeholder="e.g. Mochi"
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          className="rounded-full h-11"
        />
        {error && <p role="alert" className="text-xs text-destructive text-center">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>Back</Button>
          <Button type="submit" className="flex-1">Save</Button>
        </div>
      </form>
    </div>
  );
};
