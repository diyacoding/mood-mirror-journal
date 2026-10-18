import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PET_NAME_MAX, displayPetName, validatePetName } from "@/lib/petNames";
import { cn } from "@/lib/utils";

interface Props {
  name?: string;
  onRename: (name: string) => Promise<void>;
  className?: string;
}

/** Pet name with a small pencil to rename inline. */
export const PetNameEditor = ({ name, onRename, className }: Props) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = () => {
    setValue(displayPetName(name) === "My Pet" && !name ? "" : displayPetName(name));
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    const err = validatePetName(value);
    if (err) return setError(err);
    setBusy(true);
    try {
      await onRename(value.trim());
      setEditing(false);
      toast.success("Name saved");
    } catch (e: any) {
      setError(e?.message ?? "Couldn't save the name.");
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <span className={cn("inline-flex items-center justify-center gap-1.5 break-words", className)}>
        {displayPetName(name)}
        <button
          type="button"
          onClick={start}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Edit pet name"
          className="rounded-full p-1 opacity-70 hover:opacity-100 focus-visible:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <form
      className="flex flex-col items-center gap-1"
      onSubmit={(e) => { e.preventDefault(); void save(); }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          aria-label="Pet name"
          value={value}
          maxLength={PET_NAME_MAX * 2}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          className="h-9 w-40 rounded-full text-sm"
        />
        <Button type="submit" size="icon" variant="ghost" disabled={busy} aria-label="Save name">
          <Check className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => setEditing(false)} aria-label="Cancel">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </form>
  );
};
