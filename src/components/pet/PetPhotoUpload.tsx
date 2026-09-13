import { useRef, useState } from "react";
import { Camera, Check, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImageFile } from "@/lib/imageCompress";

interface Props {
  title?: string;
  /** Receives the compressed image data URL plus an optional pet name. */
  onSave: (compressedDataUrl: string, name?: string) => Promise<void> | void;
  onClose: () => void;
}

export const PetPhotoUpload = ({ title = "Upload a photo of my pet", onSave, onClose }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      setBusy(true);
      setPreview(await compressImageFile(file));
    } catch (e: any) {
      setError(e?.message ?? "We couldn't read that image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(preview, name.trim() || undefined);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "We couldn't upload your pet photo. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="glass-strong rounded-3xl p-4 w-full max-w-md space-y-4 shadow-glow">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm tracking-[0.25em] uppercase">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cancel photo upload"
            className="h-8 w-8 rounded-full glass flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        {preview ? (
          <div className="space-y-3">
            <div className="w-full aspect-square rounded-2xl glass ring-glow overflow-hidden">
              <img src={preview} alt="Preview of your pet photo" className="w-full h-full object-cover" />
            </div>
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-full glass border-accent/30 h-11"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Choose a different photo
            </Button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full aspect-square rounded-2xl glass border border-dashed border-accent/40 flex flex-col items-center justify-center gap-3 text-muted-foreground"
          >
            <Camera className="h-8 w-8 text-accent" />
            <span className="text-xs uppercase tracking-[0.2em]">Choose a photo</span>
            <span className="text-[10px] text-muted-foreground/80">Images up to 10MB</span>
          </button>
        )}

        <div className="space-y-1.5">
          <label htmlFor="pet-photo-name" className="text-[10px] uppercase tracking-[0.25em] text-accent/80">
            Pet name (optional)
          </label>
          <Input
            id="pet-photo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mochi"
            maxLength={40}
            className="glass rounded-full h-11"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-destructive text-center">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-full glass border-accent/30 h-11">
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={!preview || busy}
            className="flex-1 rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-11"
          >
            <Check className="h-4 w-4 mr-1" /> {busy ? "Adding…" : "Add to My Pets"}
          </Button>
        </div>
      </div>
    </div>
  );
};
