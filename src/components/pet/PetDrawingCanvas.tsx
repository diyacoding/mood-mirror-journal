import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Paintbrush, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  onSave: (dataUrl: string) => Promise<void> | void;
  onClose: () => void;
}

const BG = "transparent";

const PALETTE = [
  "#C8C8D8", "#B5D8EB", "#FFB7C5", "#D4BBFF",
  "#A8E6CF", "#F8C8B8", "#E8DCC4", "#FFF8E7",
];

export const PetDrawingCanvas = ({ title = "Create your pet", onSave, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(PALETTE[3]);
  const [eraser, setEraser] = useState(false);
  const [size, setSize] = useState(10);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
  }, []);

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
    canvasRef.current?.getContext("2d")?.closePath();
  };

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };

  const save = async () => {
    setBusy(true);
    try {
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      await onSave(dataUrl);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl p-4 w-full max-w-md space-y-3 shadow-glow">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm tracking-[0.25em] uppercase">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full glass flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setEraser(false); }}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-smooth",
                color === c && !eraser ? "border-white scale-110 shadow-glow" : "border-transparent",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="w-full aspect-square rounded-2xl touch-none ring-glow"
          style={{ background: "radial-gradient(circle, hsl(270 60% 14%), hsl(268 100% 6%))" }}
        />
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setEraser(false)}
            className={cn("h-9 px-3 rounded-full text-xs flex items-center gap-1.5 border",
              !eraser ? "border-white/40 bg-white/10" : "border-transparent text-muted-foreground")}
          ><Paintbrush className="h-3.5 w-3.5" /> Brush</button>
          <button
            onClick={() => setEraser(true)}
            className={cn("h-9 px-3 rounded-full text-xs flex items-center gap-1.5 border",
              eraser ? "border-white/40 bg-white/10" : "border-transparent text-muted-foreground")}
          ><Eraser className="h-3.5 w-3.5" /> Eraser</button>
          {[4, 10, 20].map((s) => (
            <button key={s} onClick={() => setSize(s)}
              className={cn("h-8 w-8 rounded-full border text-xs",
                size === s ? "border-white/40 bg-white/10" : "border-transparent text-muted-foreground")}
            >{s}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={clear} variant="outline" className="flex-1 rounded-full glass border-accent/30 h-11">Clear</Button>
          <Button onClick={save} disabled={busy}
            className="flex-1 rounded-full gradient-primary text-primary-foreground border-0 shadow-glow h-11">
            <Check className="h-4 w-4 mr-1" /> {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};
