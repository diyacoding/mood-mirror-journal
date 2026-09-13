import { Camera, Paintbrush, X } from "lucide-react";

interface Props {
  onDraw: () => void;
  onUpload: () => void;
  onClose: () => void;
}

export const PetCreateChoice = ({ onDraw, onUpload, onClose }: Props) => (
  <div
    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Choose how to create your pet"
  >
    <div className="glass-strong rounded-3xl p-5 w-full max-w-md space-y-4 shadow-glow">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-[0.25em] uppercase">Create your pet</h3>
        <button
          onClick={onClose}
          aria-label="Close"
          className="h-8 w-8 rounded-full glass flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Pick how you'd like to bring your new pet to life.</p>
      <div className="grid gap-3">
        <button
          onClick={onDraw}
          className="glass rounded-2xl p-4 flex items-center gap-3 text-left transition-smooth hover:scale-[1.02]"
        >
          <span className="h-11 w-11 rounded-full gradient-primary flex items-center justify-center text-primary-foreground">
            <Paintbrush className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-display tracking-wider">Draw your pet</span>
            <span className="block text-[11px] text-muted-foreground">Use the drawing canvas</span>
          </span>
        </button>
        <button
          onClick={onUpload}
          className="glass rounded-2xl p-4 flex items-center gap-3 text-left transition-smooth hover:scale-[1.02]"
        >
          <span className="h-11 w-11 rounded-full gradient-primary flex items-center justify-center text-primary-foreground">
            <Camera className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-display tracking-wider">Upload a photo</span>
            <span className="block text-[11px] text-muted-foreground">Add a photo of your real pet</span>
          </span>
        </button>
      </div>
    </div>
  </div>
);
