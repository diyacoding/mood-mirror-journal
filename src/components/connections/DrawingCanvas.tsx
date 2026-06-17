import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Paintbrush, Send, X, Minus, Circle, Dot, Sparkles, Wind, Zap, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (dataUrl: string) => Promise<void> | void;
  onClose: () => void;
}

const BG = "#1a0033";

const PALETTE = [
  { name: "Soft gray", hex: "#C8C8D8" },
  { name: "Baby blue", hex: "#B5D8EB" },
  { name: "Soft pink", hex: "#FFB7C5" },
  { name: "Lavender", hex: "#D4BBFF" },
  { name: "Mint green", hex: "#A8E6CF" },
  { name: "Soft peach", hex: "#F8C8B8" },
  { name: "Beige", hex: "#E8DCC4" },
  { name: "Cream", hex: "#FFF8E7" },
];

const SIZES = [
  { label: "S", value: 4, icon: Dot },
  { label: "M", value: 8, icon: Minus },
  { label: "L", value: 16, icon: Circle },
];

type BrushStyleKey = "soft" | "sad" | "peaceful" | "energetic";

const BRUSH_STYLES: { key: BrushStyleKey; label: string; icon: typeof Heart }[] = [
  { key: "soft", label: "Soft", icon: Heart },
  { key: "sad", label: "Gentle", icon: Wind },
  { key: "peaceful", label: "Peaceful", icon: Sparkles },
  { key: "energetic", label: "Energetic", icon: Zap },
];

function applyBrushStyle(ctx: CanvasRenderingContext2D, style: BrushStyleKey, color: string) {
  // Reset all style-related canvas properties first
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";

  switch (style) {
    case "soft":
      // Smooth gentle strokes — default behavior
      ctx.globalAlpha = 0.85;
      break;
    case "sad":
      // Lower opacity, slight transparency
      ctx.globalAlpha = 0.45;
      break;
    case "peaceful":
      // Light airy strokes, soft glow feel
      ctx.globalAlpha = 0.65;
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      break;
    case "energetic":
      // Stronger opacity, dynamic feel
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 4;
      ctx.shadowColor = color;
      break;
  }
}


export const DrawingCanvas = ({ onSend, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState(PALETTE[0].hex);
  const [eraser, setEraser] = useState(false);
  const [size, setSize] = useState(8);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
  }, []);

  // Update strokeStyle/size when tool/color/size changes without clearing canvas
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    if (eraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = size;
  }, [color, eraser, size]);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * c.width,
      y: ((e.clientY - r.top) / r.height) * c.height,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onUp = () => {
    drawing.current = false;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.closePath();
  };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, c.width, c.height);
    // Restore tool state after clear
    if (eraser) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = size;
  };

  const send = async () => {
    setBusy(true);
    try {
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      await onSend(dataUrl);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl p-4 w-full max-w-md space-y-3 shadow-glow">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm tracking-[0.25em] uppercase">Draw something</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full glass flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex gap-2 flex-wrap justify-center">
          {PALETTE.map((c) => (
            <button
              key={c.hex}
              onClick={() => {
                setColor(c.hex);
                setEraser(false);
              }}
              title={c.name}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-smooth",
                color === c.hex && !eraser
                  ? "border-white scale-110 shadow-glow"
                  : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="w-full aspect-square rounded-2xl touch-none ring-glow"
        />

        {/* Tool Row: Brush / Eraser Toggle + Size */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {/* Brush toggle */}
            <button
              onClick={() => setEraser(false)}
              className={cn(
                "h-9 px-3 rounded-full text-xs flex items-center gap-1.5 transition-smooth border",
                !eraser
                  ? "border-white/40 bg-white/10 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Paintbrush className="h-3.5 w-3.5" />
              Brush
            </button>
            {/* Eraser toggle */}
            <button
              onClick={() => setEraser(true)}
              className={cn(
                "h-9 px-3 rounded-full text-xs flex items-center gap-1.5 transition-smooth border",
                eraser
                  ? "border-white/40 bg-white/10 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Eraser className="h-3.5 w-3.5" />
              Eraser
            </button>
          </div>

          {/* Size selector */}
          <div className="flex items-center gap-1">
            {SIZES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.label}
                  onClick={() => setSize(s.value)}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-xs transition-smooth border",
                    size === s.value
                      ? "border-white/40 bg-white/10 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  title={`${s.label} (${s.value}px)`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={clear} variant="outline" className="flex-1 rounded-full glass border-accent/30 h-11">
            <Eraser className="h-4 w-4 mr-1" /> Clear
          </Button>
          <Button
            onClick={send}
            disabled={busy}
            className="flex-1 rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-11"
          >
            <Send className="h-4 w-4 mr-1" /> {busy ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
};
