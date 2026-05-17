import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Send, X } from "lucide-react";

interface Props {
  onSend: (dataUrl: string) => Promise<void> | void;
  onClose: () => void;
}

export const DrawingCanvas = ({ onSend, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#1a0033";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#C084FC";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

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
  };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#1a0033";
    ctx.fillRect(0, 0, c.width, c.height);
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
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm tracking-[0.25em] uppercase">Draw something</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full glass flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
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
